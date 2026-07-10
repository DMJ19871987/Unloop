import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { purgeExpiredCrisisTranscripts } from "@/lib/safety/crisis-retention";

/**
 * Cron auth: requires Authorization: Bearer ${CRON_SECRET}.
 * Vercel cron sends this header when CRON_SECRET is set in project env.
 * Without a valid secret the handler returns 401 and performs no DB work.
 */
function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Scheduled purge of crisis-flagged transcripts past retention window. */
export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "No database." }, { status: 503 });
  }

  const purged = await purgeExpiredCrisisTranscripts(db);

  return NextResponse.json({
    message: "Crisis transcript purge complete.",
    purged,
  });
}
