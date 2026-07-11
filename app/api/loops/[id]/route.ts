import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth/user";
import { requireWriteUser, isWriteBlocked } from "@/lib/auth/require-access";
import { getDb } from "@/lib/db/client";
import { loops, loopEvents, offloadSessions } from "@/lib/db/schema";
import { transitionLoop, toLoopDTO } from "@/lib/loops/transitions";
import { canTransition } from "@/lib/loops/state";
import { stateForGravityZone } from "@/lib/loops/gravity";
import type { ClosureAction } from "@/lib/types/loop";

const actionSchema = z
  .object({
    action: z.enum([
      "done",
      "next_step_known",
      "parked",
      "released",
      "still_on_mind",
    ]),
    nextStep: z.string().trim().min(1).optional(),
    resurfaceAfter: z.string().datetime().optional(),
    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "next_step_known" && !data.nextStep) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Next step is required.",
        path: ["nextStep"],
      });
    }
  });

const bodySchema = z.union([
  actionSchema,
  z.object({
    gravityZone: z.enum(["ready", "clarify", "waiting"]),
    nextStep: z.string().trim().min(1).optional(),
  }),
  z.object({
    label: z.string().min(1).max(80),
  }),
  z.object({
    nextStep: z.string().trim().min(1),
  }),
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  const db = getDb();

  if (!user || !db) {
    return NextResponse.json({ error: "Loop not found." }, { status: 404 });
  }

  const loop = await db.query.loops.findFirst({
    where: and(eq(loops.id, id), eq(loops.userId, user.id)),
  });

  if (!loop) {
    return NextResponse.json({ error: "Loop not found." }, { status: 404 });
  }

  const [events, sourceSession] = await Promise.all([
    db.query.loopEvents.findMany({
      where: and(eq(loopEvents.loopId, id), eq(loopEvents.userId, user.id)),
      orderBy: [desc(loopEvents.createdAt)],
    }),
    loop.firstSessionId
      ? db.query.offloadSessions.findFirst({
          where: and(
            eq(offloadSessions.id, loop.firstSessionId),
            eq(offloadSessions.userId, user.id)
          ),
        })
      : null,
  ]);

  const timeline = events.length
    ? events.map((event) => ({
        id: event.id,
        fromState: event.fromState,
        toState: event.toState,
        note: sanitiseEventNote(event.note),
        createdAt: event.createdAt?.toISOString() ?? new Date().toISOString(),
      }))
    : [
        {
          id: `${loop.id}-created`,
          fromState: null,
          toState: loop.state,
          note: null,
          createdAt: loop.createdAt?.toISOString() ?? new Date().toISOString(),
        },
      ];

  return NextResponse.json({
    loop: toLoopDTO(loop),
    events: timeline,
    source: sourceSession
      ? {
          inputMode: sourceSession.inputMode,
          createdAt:
            sourceSession.createdAt?.toISOString() ??
            loop.createdAt?.toISOString() ??
            new Date().toISOString(),
          transcriptRetained: Boolean(user.keepTranscripts && sourceSession.transcript),
        }
      : null,
  });
}

function sanitiseEventNote(note: string | null): string | null {
  if (!note) return null;
  const normalised = note.toLowerCase();
  if (
    normalised === "weight increased" ||
    normalised === "reopened from record" ||
    normalised.startsWith("merged into ")
  ) {
    return null;
  }
  return note.slice(0, 240);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const writeUser = await requireWriteUser();
  if (isWriteBlocked(writeUser)) return writeUser;
  const user = writeUser;
  const db = getDb();

  if (!db) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const data = bodySchema.parse(body);

    if ("label" in data) {
      const [updated] = await db
        .update(loops)
        .set({ label: data.label, updatedAt: new Date() })
        .where(and(eq(loops.id, id), eq(loops.userId, user.id)))
        .returning();

      if (!updated) {
        return NextResponse.json({ error: "Loop not found." }, { status: 404 });
      }
      return NextResponse.json({ loop: toLoopDTO(updated) });
    }

    if ("gravityZone" in data) {
      const existing = await db.query.loops.findFirst({
        where: and(eq(loops.id, id), eq(loops.userId, user.id)),
      });

      if (!existing) {
        return NextResponse.json({ error: "Loop not found." }, { status: 404 });
      }

      const toState = stateForGravityZone(data.gravityZone);
      const nextStep = data.nextStep ?? existing.nextStep;
      if (data.gravityZone === "ready" && !nextStep) {
        return NextResponse.json(
          { error: "Add a next step before moving this loop to Ready." },
          { status: 400 }
        );
      }
      if (!canTransition(existing.state, toState)) {
        return NextResponse.json(
          { error: `Cannot move this loop from ${existing.state}.` },
          { status: 400 }
        );
      }

      const now = new Date();
      const resurfaceAfter =
        data.gravityZone === "waiting"
          ? existing.resurfaceAfter ?? new Date(now.getTime() + 21 * 86400000)
          : null;
      const eventNote =
        data.gravityZone === "ready"
          ? nextStep
          : data.gravityZone === "waiting"
            ? "Moved to waiting"
            : "Moved to needs clarity";

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(loops)
          .set({
            state: toState,
            nextStep: data.gravityZone === "clarify" ? null : nextStep,
            resurfaceAfter,
            updatedAt: now,
          })
          .where(and(eq(loops.id, id), eq(loops.userId, user.id)))
          .returning();

        if (!row) throw new Error("Loop not found.");

        await tx.insert(loopEvents).values({
          loopId: id,
          userId: user.id,
          fromState: existing.state,
          toState,
          note: eventNote,
        });

        return row;
      });

      return NextResponse.json({ loop: toLoopDTO(updated) });
    }

    if ("nextStep" in data && !("action" in data)) {
      const existing = await db.query.loops.findFirst({
        where: and(eq(loops.id, id), eq(loops.userId, user.id)),
      });

      if (!existing) {
        return NextResponse.json({ error: "Loop not found." }, { status: 404 });
      }

      const toState =
        existing.state === "open_attention" || existing.state === "parked"
          ? "next_step_known"
          : existing.state;

      if (!canTransition(existing.state, toState)) {
        throw new Error(`Cannot transition from ${existing.state} to ${toState}`);
      }

      const [updated] = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(loops)
          .set({
            nextStep: data.nextStep,
            state: toState,
            updatedAt: new Date(),
          })
          .where(and(eq(loops.id, id), eq(loops.userId, user.id)))
          .returning();

        await tx.insert(loopEvents).values({
          loopId: id,
          userId: user.id,
          fromState: existing.state,
          toState,
          note: data.nextStep,
        });

        return [row];
      });

      return NextResponse.json({ loop: toLoopDTO(updated) });
    }

    const updated = await transitionLoop(
      db,
      user.id,
      id,
      data.action as ClosureAction,
      {
        nextStep: data.nextStep,
        resurfaceAfter: data.resurfaceAfter
          ? new Date(data.resurfaceAfter)
          : undefined,
        note: data.note,
      }
    );

    return NextResponse.json({ loop: toLoopDTO(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const writeUser = await requireWriteUser();
  if (isWriteBlocked(writeUser)) return writeUser;
  const user = writeUser;
  const db = getDb();

  if (!db) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  await db
    .delete(loops)
    .where(and(eq(loops.id, id), eq(loops.userId, user.id)));

  return NextResponse.json({ success: true });
}
