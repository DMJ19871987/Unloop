import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import {
  getClosedLoops,
  getWeeklySummaries,
  formatCounterText,
} from "@/lib/loops/record";
import { toLoopDTO } from "@/lib/loops/transitions";

export async function GET() {
  const user = await getOrCreateUser();
  const db = getDb();

  if (!user || !db) {
    return NextResponse.json({
      closedLoops: [],
      counter: "0 loops released",
      weeklySummaries: [],
    });
  }

  const closed = await getClosedLoops(db, user.id);
  const summaries = await getWeeklySummaries(db, user.id);

  const since = user.createdAt ?? new Date();
  const counter = formatCounterText(closed.length, since);

  const closedLoops = closed.map((l, i) => ({
    ...toLoopDTO(l),
    size: Math.max(46, 90 - i * 4),
  }));

  return NextResponse.json({
    closedLoops,
    counter,
    weeklySummaries: summaries.map((s) => ({
      id: s.id,
      weekStart: s.weekStart.toISOString(),
      summaryText: s.summaryText,
      stats: s.stats,
      createdAt: s.createdAt?.toISOString(),
    })),
  });
}
