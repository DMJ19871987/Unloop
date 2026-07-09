import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { loops, offloadSessions, loopEvents, users } from "@/lib/db/schema";
import { extractLoops } from "@/lib/ai/extract";
import { getActiveLoops, toLoopDTO } from "@/lib/loops/transitions";
import { visualSeedFromLabel } from "@/lib/loops/state";
import { computeLoopLayout, summariseLoops } from "@/lib/loops/layout";
import { checkRateLimit } from "@/lib/rate-limit";
import type { LoopCategory } from "@/lib/types/loop";

const bodySchema = z.object({
  transcript: z.string().min(1),
  inputMode: z.enum(["voice", "text"]),
  durationSeconds: z.number().optional(),
});

const extractionLocks = new Map<string, Promise<unknown>>();

const VALID_CATEGORIES = new Set([
  "people", "decisions", "logistics", "home", "work", "money", "health", "ideas", "other",
]);

export async function POST(request: Request) {
  const user = await getOrCreateUser();
  const db = getDb();

  if (!user || !db) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  const run = async () => {
    const rate = await checkRateLimit(user.id, ["extract"]);
    if (!rate.allowed) {
      return NextResponse.json({ error: rate.message }, { status: 429 });
    }

    const body = await request.json();
    const { transcript, inputMode, durationSeconds } = bodySchema.parse(body);

    const existing = await getActiveLoops(db, user.id);
    const existingInput = existing.map((l) => ({
      id: l.id,
      label: l.label,
      state: l.state,
      weight: l.weight,
    }));

    const extraction = await extractLoops(transcript, existingInput, user.id);

    const [session] = await db
      .insert(offloadSessions)
      .values({
        userId: user.id,
        inputMode,
        transcript: user.keepTranscripts ? transcript : null,
        durationSeconds: durationSeconds ?? null,
        loopsExtracted: extraction.new_loops.length,
        loopsMatched: extraction.matched_loops.length,
      })
      .returning();

    await db
      .update(users)
      .set({
        sessionsCompleted: sql`${users.sessionsCompleted} + 1`,
      })
      .where(eq(users.id, user.id));

    let showCrisisCard = false;
    if (extraction.flag === "crisis") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (!user.crisisCardShownAt || user.crisisCardShownAt < weekAgo) {
        showCrisisCard = true;
        await db
          .update(users)
          .set({ crisisCardShownAt: new Date() })
          .where(eq(users.id, user.id));
      }
    }

    for (const matched of extraction.matched_loops) {
      const loop = existing.find((l) => l.id === matched.loop_id);
      if (!loop) continue;

      const newWeight = Math.min(5, loop.weight + (matched.weight_delta ?? 0));
      const newState =
        matched.next_step && loop.state === "open_attention"
          ? "next_step_known"
          : loop.state;

      await db.transaction(async (tx) => {
        await tx
          .update(loops)
          .set({
            weight: newWeight,
            mentionCount: (loop.mentionCount ?? 1) + 1,
            nextStep: matched.next_step ?? loop.nextStep,
            state: newState as typeof loop.state,
            updatedAt: new Date(),
          })
          .where(eq(loops.id, matched.loop_id));

        await tx.insert(loopEvents).values({
          loopId: matched.loop_id,
          userId: user.id,
          fromState: loop.state,
          toState: newState as typeof loop.state,
          note: matched.next_step,
        });
      });
    }

    const newLoopRecords = [];
    for (const item of extraction.new_loops.slice(0, 12)) {
      const category = VALID_CATEGORIES.has(item.category)
        ? (item.category as LoopCategory)
        : "other";
      const state = item.next_step ? "next_step_known" : "open_attention";

      const [created] = await db
        .insert(loops)
        .values({
          userId: user.id,
          label: item.label,
          state,
          category,
          weight: Math.min(5, Math.max(1, item.weight)),
          emotionalIntensity: Math.min(5, Math.max(1, item.emotional_intensity)),
          nextStep: item.next_step,
          visualSeed: visualSeedFromLabel(item.label, user.id),
          firstSessionId: session.id,
          mentionCount: 1,
        })
        .returning();

      await db.insert(loopEvents).values({
        loopId: created.id,
        userId: user.id,
        fromState: null,
        toState: state,
        note: item.next_step,
      });

      newLoopRecords.push(created);
    }

    const active = await getActiveLoops(db, user.id);
    const dtos = active.map(toLoopDTO);
    const positions = computeLoopLayout(
      dtos.map((l) => ({
        id: l.id,
        state: l.state,
        weight: l.weight,
        emotionalIntensity: l.emotionalIntensity,
      })),
      390,
      600
    );
    const posMap = new Map(positions.map((p) => [p.id, p]));
    const loopsWithPos = dtos.map((l) => ({
      ...l,
      x: posMap.get(l.id)?.x,
      y: posMap.get(l.id)?.y,
    }));

    return NextResponse.json({
      sessionId: session.id,
      newLoops: newLoopRecords.map(toLoopDTO),
      matchedLoops: extraction.matched_loops
        .map((m) => {
          const l = active.find((a) => a.id === m.loop_id);
          return l ? { id: l.id, label: l.label } : null;
        })
        .filter(Boolean),
      loops: loopsWithPos,
      stats: {
        new: extraction.new_loops.length,
        matched: extraction.matched_loops.length,
        total: loopsWithPos.length,
        openAttention: loopsWithPos.filter((l) => l.state === "open_attention").length,
        nextStepKnown: loopsWithPos.filter((l) => l.state === "next_step_known").length,
        parked: loopsWithPos.filter((l) => l.state === "parked").length,
      },
      flag: extraction.flag,
      showCrisisCard,
      rateLimitWarning: rate.soft ? rate.message : undefined,
      summary: summariseLoops(loopsWithPos),
    });
  };

  try {
    const existing = extractionLocks.get(user.id);
    if (existing) await existing;

    const promise = run();
    extractionLocks.set(user.id, promise);
    try {
      return await promise;
    } finally {
      extractionLocks.delete(user.id);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Could not find your loops. Try again." },
      { status: 500 }
    );
  }
}
