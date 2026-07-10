import { NextResponse } from "next/server";
import { eq, and, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users, loopEvents, loops, weeklySummaries } from "@/lib/db/schema";
import { generateWeeklySummary } from "@/lib/ai/generate-weekly";
import {
  computeWeekStats,
  getWeekStartInTz,
  isUserDueForWeeklySummary,
} from "@/lib/loops/record";
import { sendWeeklySummaryEmail } from "@/lib/email/weekly";

function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "No database." }, { status: 503 });
  }

  const allUsers = await db.query.users.findMany();
  let generated = 0;

  for (const user of allUsers) {
    const tz = user.timezone ?? "Europe/London";
    if (!isUserDueForWeeklySummary(tz, 18, 0)) continue;

    const weekStart = getWeekStartInTz(tz);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const existing = await db.query.weeklySummaries.findFirst({
      where: and(
        eq(weeklySummaries.userId, user.id),
        gte(weeklySummaries.weekStart, weekStart)
      ),
    });
    if (existing) continue;

    const events = await db.query.loopEvents.findMany({
      where: and(
        eq(loopEvents.userId, user.id),
        gte(loopEvents.createdAt, weekStart)
      ),
      with: { loop: true },
    });

    if (events.length === 0) continue;

    const eventInputs = events.map((e) => ({
      label: e.loop?.label ?? "unknown",
      category: e.loop?.category ?? "other",
      fromState: e.fromState,
      toState: e.toState,
      createdAt: e.createdAt?.toISOString() ?? "",
    }));

    const userLoops = await db.query.loops.findMany({
      where: eq(loops.userId, user.id),
    });

    const stats = computeWeekStats(events, userLoops);
    const summaryText = await generateWeeklySummary(eventInputs, stats, user.id);

    await db.insert(weeklySummaries).values({
      userId: user.id,
      weekStart,
      summaryText,
      stats,
    });

    if (user.weeklyEmailEnabled) {
      await sendWeeklySummaryEmail(user.email, summaryText);
    }

    generated++;
  }

  return NextResponse.json({ generated });
}
