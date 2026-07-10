import { eq, and } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { loops, loopEvents } from "@/lib/db/schema";
import { canTransition, isTerminal } from "@/lib/loops/state";
import type { LoopState } from "@/lib/loops/state";
import {
  type AppliedLoopChange,
  type LoopChangePayload,
  clampWeight,
  fromApiState,
} from "./extraction-types";
import { previewAppliedValues } from "./apply-policy";

/** Map API/model state labels to DB enum before any write. */
export function normalizeChangeForWrite(
  change: AppliedLoopChange | LoopChangePayload
): AppliedLoopChange | LoopChangePayload {
  if (!("state" in change) || !change.state) return change;
  const mapped = fromApiState(change.state as string);
  if (!mapped) return change;
  return { ...change, state: mapped };
}

export async function applyLoopChange(
  db: Db,
  userId: string,
  loopId: string,
  change: AppliedLoopChange | LoopChangePayload,
  note?: string | null
) {
  const loop = await db.query.loops.findFirst({
    where: and(eq(loops.id, loopId), eq(loops.userId, userId)),
  });

  if (!loop) {
    throw new Error("Loop not found");
  }

  const normalized = normalizeChangeForWrite(change);
  const preview = previewAppliedValues(loop, normalized);
  const writeState = preview.state;
  const fromState = loop.state;

  if (writeState !== fromState && !canTransition(fromState, writeState)) {
    throw new Error(`Cannot transition from ${fromState} to ${writeState}`);
  }

  const now = new Date();
  const closing = isTerminal(writeState);
  const eventNote =
    note ??
    (typeof normalized.next_step === "string" ? normalized.next_step : null) ??
    null;

  const [updated] = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(loops)
      .set({
        weight: preview.weight,
        emotionalIntensity: preview.emotionalIntensity,
        mentionCount: preview.mentionCount,
        nextStep:
          typeof normalized.next_step === "string"
            ? normalized.next_step
            : loop.nextStep,
        state: writeState,
        closedAt: closing ? now : loop.closedAt,
        updatedAt: now,
      })
      .where(eq(loops.id, loopId))
      .returning();

    await tx.insert(loopEvents).values({
      loopId,
      userId,
      fromState,
      toState: writeState,
      note: eventNote,
    });

    return [row];
  });

  return updated;
}

export async function applyMerge(
  db: Db,
  userId: string,
  sourceLoopId: string,
  targetLoopId: string
) {
  const [source, target] = await Promise.all([
    db.query.loops.findFirst({
      where: and(eq(loops.id, sourceLoopId), eq(loops.userId, userId)),
    }),
    db.query.loops.findFirst({
      where: and(eq(loops.id, targetLoopId), eq(loops.userId, userId)),
    }),
  ]);

  if (!source || !target) {
    throw new Error("Loop not found");
  }

  const [updated] = await db
    .update(loops)
    .set({
      weight: clampWeight(Math.min(5, target.weight + 1)),
      mentionCount: (target.mentionCount ?? 1) + (source.mentionCount ?? 1),
      updatedAt: new Date(),
    })
    .where(eq(loops.id, targetLoopId))
    .returning();

  await db.delete(loops).where(eq(loops.id, sourceLoopId));

  return updated;
}

export async function applyBatchChanges(
  db: Db,
  userId: string,
  changes: AppliedLoopChange[]
) {
  const updated: (typeof loops.$inferSelect)[] = [];

  for (const change of changes) {
    const row = await applyLoopChange(db, userId, change.loop_id, change, change.evidence);
    updated.push(row);
  }

  return updated;
}

export function resolveStateFromChange(
  current: LoopState,
  change: LoopChangePayload
): LoopState {
  if (!change.state) return current;
  return fromApiState(change.state as string) ?? change.state;
}
