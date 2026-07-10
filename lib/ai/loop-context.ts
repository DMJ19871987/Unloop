import { desc, eq, inArray, and } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { loopEvents, loops } from "@/lib/db/schema";
import type { ExistingLoopContext } from "./extraction-types";
import { toApiState } from "./extraction-types";

const SYSTEM_NOTES = new Set(["weight increased", "weight decreased"]);

function snippet(text: string | null | undefined, max = 140): string | null {
  if (!text?.trim()) return null;
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export async function fetchLastNoteSnippets(
  db: Db,
  userId: string,
  loopIds: string[]
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  if (loopIds.length === 0) return result;

  const events = await db
    .select({
      loopId: loopEvents.loopId,
      note: loopEvents.note,
      createdAt: loopEvents.createdAt,
    })
    .from(loopEvents)
    .where(and(eq(loopEvents.userId, userId), inArray(loopEvents.loopId, loopIds)))
    .orderBy(desc(loopEvents.createdAt));

  for (const id of loopIds) {
    result.set(id, null);
  }

  for (const event of events) {
    if (result.get(event.loopId) !== null) continue;
    const note = event.note?.trim();
    if (!note || SYSTEM_NOTES.has(note.toLowerCase())) continue;
    result.set(event.loopId, snippet(note));
  }

  return result;
}

export async function buildExistingLoopContext(
  db: Db,
  userId: string,
  activeLoops: (typeof loops.$inferSelect)[]
): Promise<ExistingLoopContext[]> {
  const loopIds = activeLoops.map((l) => l.id);
  const snippets = await fetchLastNoteSnippets(db, userId, loopIds);

  return activeLoops.map((loop) => ({
    id: loop.id,
    label: loop.label,
    state: toApiState(loop.state),
    weight: loop.weight,
    emotional_intensity: loop.emotionalIntensity,
    category: loop.category ?? "other",
    next_step: loop.nextStep,
    mention_count: loop.mentionCount ?? 1,
    last_updated: (loop.updatedAt ?? loop.createdAt ?? new Date()).toISOString(),
    last_note_snippet: snippets.get(loop.id) ?? null,
  }));
}
