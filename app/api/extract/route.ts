import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth/user";
import { requireWriteUser, isWriteBlocked } from "@/lib/auth/require-access";
import { getDb } from "@/lib/db/client";
import { loops, offloadSessions, loopEvents, users } from "@/lib/db/schema";
import { extractLoops } from "@/lib/ai/extract";
import { buildExistingLoopContext } from "@/lib/ai/loop-context";
import { applyPolicy } from "@/lib/ai/apply-policy";
import { applyBatchChangesTx } from "@/lib/ai/apply-changes";
import { getActiveLoops, toLoopDTO } from "@/lib/loops/transitions";
import { visualSeedFromLabel } from "@/lib/loops/state";
import { computeLoopLayout, summariseLoops, partitionFieldLoops } from "@/lib/loops/layout";
import { checkRateLimit } from "@/lib/rate-limit";
import { CRISIS_RESOURCES } from "@/lib/safety/crisis-resources";
import { crisisPrescreen } from "@/lib/safety/crisis-prescreen";
import type { LoopCategory } from "@/lib/types/loop";
import { fromApiState } from "@/lib/ai/extraction-types";

const bodySchema = z.object({
  transcript: z.string().min(1),
  inputMode: z.enum(["voice", "text"]),
  durationSeconds: z.number().optional(),
});

const VALID_CATEGORIES = new Set([
  "people", "decisions", "logistics", "home", "work", "money", "health", "ideas", "other",
]);

async function respondToCrisis(input: {
  transcript: string;
  inputMode: "voice" | "text";
  durationSeconds?: number;
}) {
  const { transcript, inputMode, durationSeconds } = input;
  let sessionId: string | undefined;

  const user = await getOrCreateUser();
  const db = getDb();

  if (user && db) {
    try {
      const [session] = await db
        .insert(offloadSessions)
        .values({
          userId: user.id,
          inputMode,
          transcript,
          durationSeconds: durationSeconds ?? null,
          loopsExtracted: 0,
          loopsMatched: 0,
          crisis: true,
        })
        .returning();

      sessionId = session.id;

      await db
        .update(users)
        .set({
          sessionsCompleted: sql`${users.sessionsCompleted} + 1`,
        })
        .where(eq(users.id, user.id));
    } catch (error) {
      console.error("Crisis session persist failed:", error);
    }
  }

  return NextResponse.json({
    crisis: true,
    sessionId,
    resources: CRISIS_RESOURCES,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transcript, inputMode, durationSeconds } = bodySchema.parse(body);

    if (crisisPrescreen(transcript)) {
      return await respondToCrisis({ transcript, inputMode, durationSeconds });
    }

    const writeUser = await requireWriteUser();
    if (isWriteBlocked(writeUser)) return writeUser;
    const user = writeUser;
    const db = getDb();

    if (!db) {
      return NextResponse.json({ error: "Unavailable." }, { status: 503 });
    }

    const rate = await checkRateLimit(user.id);
    if (!rate.allowed) {
      return NextResponse.json({ error: rate.message }, { status: 429 });
    }

    const existing = await getActiveLoops(db, user.id);
    const existingContext = await buildExistingLoopContext(db, user.id, existing);

    const extraction = await extractLoops(transcript, existingContext, user.id);

    if (extraction.flag === "crisis") {
      return await respondToCrisis({ transcript, inputMode, durationSeconds });
    }

    const { applied, proposals } = applyPolicy(extraction, existing);

    const sortedNewLoops = [...extraction.new_loops].sort((a, b) => b.weight - a.weight);
    const newLoopsToCreate = sortedNewLoops.slice(0, 12);
    if (sortedNewLoops.length > 12) {
      console.warn(
        `User ${user.id}: dropped ${sortedNewLoops.length - 12} loops beyond session cap`
      );
    }

    const txResult = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`);

      const [session] = await tx
        .insert(offloadSessions)
        .values({
          userId: user.id,
          inputMode,
          transcript: user.keepTranscripts ? transcript : null,
          durationSeconds: durationSeconds ?? null,
          loopsExtracted: newLoopsToCreate.length,
          loopsMatched: applied.length,
          crisis: false,
        })
        .returning();

      await tx
        .update(users)
        .set({
          sessionsCompleted: sql`${users.sessionsCompleted} + 1`,
        })
        .where(eq(users.id, user.id));

      const updatedRecords = await applyBatchChangesTx(tx, user.id, applied);

      const newLoopRecords = [];
      for (const item of newLoopsToCreate) {
        const category = VALID_CATEGORIES.has(item.category)
          ? (item.category as LoopCategory)
          : "other";
        const suggestedState = fromApiState(item.state ?? null);
        const state =
          suggestedState === "parked"
            ? "parked"
            : item.next_step
              ? "next_step_known"
              : "open_attention";

        const [created] = await tx
          .insert(loops)
          .values({
            userId: user.id,
            label: item.label,
            state,
            category,
            weight: Math.min(5, Math.max(1, item.weight)),
            emotionalIntensity: Math.min(5, Math.max(1, item.emotional_intensity)),
            nextStep: item.next_step,
            resurfaceAfter:
              state === "parked" ? new Date(Date.now() + 21 * 86400000) : null,
            visualSeed: visualSeedFromLabel(item.label, user.id),
            firstSessionId: session.id,
            mentionCount: 1,
          })
          .returning();

        await tx.insert(loopEvents).values({
          loopId: created.id,
          userId: user.id,
          fromState: null,
          toState: state,
          note: item.evidence ?? item.next_step,
        });

        newLoopRecords.push(created);
      }

      return { session, updatedRecords, newLoopRecords };
    });

    const { session, updatedRecords, newLoopRecords } = txResult;

    const active = await getActiveLoops(db, user.id);
    const dtos = active.map(toLoopDTO);
    const { visible } = partitionFieldLoops(
      dtos.map((l) => ({
        id: l.id,
        state: l.state,
        weight: l.weight,
        emotionalIntensity: l.emotionalIntensity,
        label: l.label,
        visualSeed: l.visualSeed,
      })),
      false
    );
    const visibleIds = new Set(visible.map((v) => v.id));
    const toLayout = dtos.filter((l) => visibleIds.has(l.id));

    const positions = computeLoopLayout(
      toLayout.map((l) => ({
        id: l.id,
        state: l.state,
        weight: l.weight,
        emotionalIntensity: l.emotionalIntensity,
        label: l.label,
        visualSeed: l.visualSeed,
      })),
      390,
      520,
      { visibleCount: toLayout.length }
    );
    const posMap = new Map(positions.map((p) => [p.id, p]));
    const loopsWithPos = dtos.map((l) => ({
      ...l,
      x: posMap.get(l.id)?.x,
      y: posMap.get(l.id)?.y,
    }));

    const createdDtos = newLoopRecords.map(toLoopDTO);
    const updatedDtos = updatedRecords.map(toLoopDTO);

    return NextResponse.json({
      sessionId: session.id,
      created: createdDtos,
      updated: updatedDtos,
      proposals,
      newLoops: createdDtos,
      matchedLoops: updatedDtos.map((l) => ({ id: l.id, label: l.label })),
      loops: loopsWithPos,
      stats: {
        new: newLoopsToCreate.length,
        matched: applied.length,
        total: loopsWithPos.length,
        openAttention: loopsWithPos.filter((l) => l.state === "open_attention").length,
        nextStepKnown: loopsWithPos.filter((l) => l.state === "next_step_known").length,
        parked: loopsWithPos.filter((l) => l.state === "parked").length,
      },
      rateLimitWarning: rate.soft ? rate.message : undefined,
      summary: summariseLoops(loopsWithPos),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    console.error("Extract failed:", error);
    return NextResponse.json(
      { error: "Could not find your loops. Try again." },
      { status: 500 }
    );
  }
}
