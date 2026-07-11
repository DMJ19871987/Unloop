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

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Map API/model state labels to DB enum before any write. */
export function normalizeChangeForWrite(
  change: AppliedLoopChange | LoopChangePayload
): AppliedLoopChange | LoopChangePayload {
  if (!("state" in change) || !change.state) return change;
  const mapped = fromApiState(change.state as string);
  if (!mapped) return change;
  return { ...change, state: mapped };
}

export async function applyLoopChangeTx(
  tx: Tx,
  userId: string,
  loopId: string,
  change: AppliedLoopChange | LoopChangePayload,
  note?: string | null
) {
  const loop = await tx.query.loops.findFirst({
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

  return row;
}

export async function applyLoopChange(
  db: Db,
  userId: string,
  loopId: string,
  change: AppliedLoopChange | LoopChangePayload,
  note?: string | null
) {
  const [updated] = await db.transaction(async (tx) => {
    const row = await applyLoopChangeTx(tx, userId, loopId, change, note);
    return [row];
  });

  return updated;
}

export async function applyMergeTx(
  tx: Tx,
  userId: string,
  sourceLoopId: string,
  targetLoopId: string
) {
  const [source, target] = await Promise.all([
    tx.query.loops.findFirst({
      where: and(eq(loops.id, sourceLoopId), eq(loops.userId, userId)),
    }),
    tx.query.loops.findFirst({
      where: and(eq(loops.id, targetLoopId), eq(loops.userId, userId)),
    }),
  ]);

  if (!source || !target) {
    throw new Error("Loop not found");
  }
  if (sourceLoopId === targetLoopId) {
    throw new Error("A loop cannot be merged into itself");
  }
  if (isTerminal(source.state) || isTerminal(target.state)) {
    throw new Error("Closed loops cannot be merged");
  }

  const now = new Date();
  const sourceEvents = await tx.query.loopEvents.findMany({
    where: and(eq(loopEvents.loopId, sourceLoopId), eq(loopEvents.userId, userId)),
  });

  const [updated] = await tx
    .update(loops)
    .set({
      weight: clampWeight(Math.min(5, target.weight + 1)),
      mentionCount: (target.mentionCount ?? 1) + (source.mentionCount ?? 1),
      updatedAt: now,
    })
    .where(eq(loops.id, targetLoopId))
    .returning();

  if (sourceEvents.length > 0) {
    await tx.insert(loopEvents).values(
      sourceEvents.map((event) => ({
        loopId: targetLoopId,
        userId,
        fromState: event.fromState,
        toState: event.toState,
        note: event.note
          ? `[From ${source.label}] ${event.note}`
          : `[From ${source.label}]`,
        createdAt: event.createdAt ?? now,
      }))
    );
  }

  await tx.insert(loopEvents).values({
    loopId: targetLoopId,
    userId,
    fromState: target.state,
    toState: target.state,
    note: `Merged "${source.label}" into this loop.`,
    createdAt: now,
  });

  await tx.delete(loops).where(eq(loops.id, sourceLoopId));

  return updated;
}

export async function applyMerge(
  db: Db,
  userId: string,
  sourceLoopId: string,
  targetLoopId: string
) {
  const [updated] = await db.transaction(async (tx) => {
    const row = await applyMergeTx(tx, userId, sourceLoopId, targetLoopId);
    return [row];
  });

  return updated;
}

export async function applyBatchChangesTx(
  tx: Tx,
  userId: string,
  changes: AppliedLoopChange[]
) {
  const updated: (typeof loops.$inferSelect)[] = [];

  for (const change of changes) {
    const row = await applyLoopChangeTx(tx, userId, change.loop_id, change, change.evidence);
    updated.push(row);
  }

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
