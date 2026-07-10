import { lt, and, eq, isNotNull } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { offloadSessions } from "@/lib/db/schema";
import { crisisTranscriptRetentionDays } from "./crisis-resources";

/** Purge crisis-flagged transcripts older than the retention window. */
export async function purgeExpiredCrisisTranscripts(db: Db): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - crisisTranscriptRetentionDays());

  const purged = await db
    .update(offloadSessions)
    .set({ transcript: null })
    .where(
      and(
        eq(offloadSessions.crisis, true),
        isNotNull(offloadSessions.transcript),
        lt(offloadSessions.createdAt, cutoff)
      )
    )
    .returning({ id: offloadSessions.id });

  return purged.length;
}
