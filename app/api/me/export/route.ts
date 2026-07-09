import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import {
  users,
  loops,
  loopEvents,
  offloadSessions,
  weeklySummaries,
} from "@/lib/db/schema";

export async function GET() {
  const user = await getOrCreateUser();
  const db = getDb();
  if (!user || !db) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const [userLoops, events, sessions, summaries] = await Promise.all([
    db.query.loops.findMany({ where: eq(loops.userId, user.id) }),
    db.query.loopEvents.findMany({ where: eq(loopEvents.userId, user.id) }),
    db.query.offloadSessions.findMany({ where: eq(offloadSessions.userId, user.id) }),
    db.query.weeklySummaries.findMany({ where: eq(weeklySummaries.userId, user.id) }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      email: user.email,
      timezone: user.timezone,
      createdAt: user.createdAt,
    },
    loops: userLoops,
    loopEvents: events,
    sessions: user.keepTranscripts
      ? sessions
      : sessions.map((s) => ({ ...s, transcript: null })),
    weeklySummaries: summaries,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="unloop-export.json"',
    },
  });
}
