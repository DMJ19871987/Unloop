import { eq, and, inArray, not } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { loops, loopEvents } from "@/lib/db/schema";
import {
  canTransition,
  isTerminal,
  type LoopState,
  visualSeedFromLabel,
} from "./state";
import type { ClosureAction } from "@/lib/types/loop";

const ACTION_TO_STATE: Record<ClosureAction, LoopState | "weight_bump"> = {
  done: "done",
  next_step_known: "next_step_known",
  parked: "parked",
  released: "released",
  still_on_mind: "weight_bump",
};

export function actionToState(action: ClosureAction): LoopState | "weight_bump" {
  return ACTION_TO_STATE[action];
}

export async function transitionLoop(
  db: Db,
  userId: string,
  loopId: string,
  action: ClosureAction,
  options?: { nextStep?: string; resurfaceAfter?: Date; note?: string }
) {
  const loop = await db.query.loops.findFirst({
    where: and(eq(loops.id, loopId), eq(loops.userId, userId)),
  });

  if (!loop) {
    throw new Error("Loop not found");
  }

  if (action === "still_on_mind") {
    const newWeight = Math.min(5, loop.weight + 1);
    const [updated] = await db.transaction(async (tx) => {
      const [u] = await tx
        .update(loops)
        .set({ weight: newWeight, updatedAt: new Date() })
        .where(eq(loops.id, loopId))
        .returning();

      await tx.insert(loopEvents).values({
        loopId,
        userId,
        fromState: loop.state,
        toState: loop.state,
        note: "weight increased",
      });

      return [u];
    });
    return updated;
  }

  const toState = actionToState(action) as LoopState;

  if (!canTransition(loop.state, toState)) {
    throw new Error(`Cannot transition from ${loop.state} to ${toState}`);
  }

  const now = new Date();
  const isClosing = isTerminal(toState);

  const [updated] = await db.transaction(async (tx) => {
    const [u] = await tx
      .update(loops)
      .set({
        state: toState,
        nextStep: options?.nextStep ?? loop.nextStep,
        resurfaceAfter: options?.resurfaceAfter ?? loop.resurfaceAfter,
        closedAt: isClosing ? now : loop.closedAt,
        updatedAt: now,
      })
      .where(eq(loops.id, loopId))
      .returning();

    await tx.insert(loopEvents).values({
      loopId,
      userId,
      fromState: loop.state,
      toState,
      note: options?.nextStep ?? options?.note ?? null,
    });

    return [u];
  });

  return updated;
}

export async function getActiveLoops(db: Db, userId: string) {
  return db.query.loops.findMany({
    where: and(
      eq(loops.userId, userId),
      not(inArray(loops.state, ["released", "done"]))
    ),
    orderBy: (l, { desc }) => [desc(l.updatedAt)],
  });
}

export function toLoopDTO(loop: typeof loops.$inferSelect) {
  return {
    id: loop.id,
    label: loop.label,
    state: loop.state,
    category: loop.category ?? "other",
    weight: loop.weight,
    emotionalIntensity: loop.emotionalIntensity,
    nextStep: loop.nextStep,
    mentionCount: loop.mentionCount ?? 1,
    visualSeed: loop.visualSeed,
    resurfaceAfter: loop.resurfaceAfter?.toISOString() ?? null,
    closedAt: loop.closedAt?.toISOString() ?? null,
    createdAt: loop.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: loop.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}
