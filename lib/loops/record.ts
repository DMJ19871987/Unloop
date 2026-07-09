import { eq, and, inArray, lte, or, isNull, lt, desc } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { loops, loopEvents, weeklySummaries, users } from "@/lib/db/schema";
import { toLoopDTO } from "./transitions";

const TERMINAL_STATES = ["released", "done"] as const;

export async function getClosedLoops(db: Db, userId: string) {
  return db.query.loops.findMany({
    where: and(
      eq(loops.userId, userId),
      inArray(loops.state, [...TERMINAL_STATES])
    ),
    orderBy: [desc(loops.closedAt)],
  });
}

export async function getReleasedCount(db: Db, userId: string) {
  const closed = await getClosedLoops(db, userId);
  return closed.length;
}

export async function getWeeklySummaries(db: Db, userId: string) {
  return db.query.weeklySummaries.findMany({
    where: eq(weeklySummaries.userId, userId),
    orderBy: [desc(weeklySummaries.weekStart)],
  });
}

export async function reopenLoop(db: Db, userId: string, loopId: string) {
  const loop = await db.query.loops.findFirst({
    where: and(eq(loops.id, loopId), eq(loops.userId, userId)),
  });

  if (!loop || !TERMINAL_STATES.includes(loop.state as "released" | "done")) {
    throw new Error("Loop cannot be reopened");
  }

  const [updated] = await db.transaction(async (tx) => {
    const [u] = await tx
      .update(loops)
      .set({
        state: "open_attention",
        closedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(loops.id, loopId))
      .returning();

    await tx.insert(loopEvents).values({
      loopId,
      userId,
      fromState: loop.state,
      toState: "open_attention",
      note: "reopened from record",
    });

    return [u];
  });

  return toLoopDTO(updated);
}

export async function getStaleParkedLoops(db: Db, userId: string) {
  const twentyOneDaysAgo = new Date();
  twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);
  const now = new Date();

  return db.query.loops.findMany({
    where: and(
      eq(loops.userId, userId),
      eq(loops.state, "parked"),
      or(
        lte(loops.resurfaceAfter, now),
        and(isNull(loops.resurfaceAfter), lt(loops.updatedAt, twentyOneDaysAgo))
      )
    ),
  });
}

export function formatCounterText(count: number, since: Date): string {
  const month = since.toLocaleDateString("en-GB", { month: "long" });
  return `${count} loop${count === 1 ? "" : "s"} released since ${month}`;
}

export async function shouldShowResurfaceBanner(db: Db, userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) return { show: false, loops: [] };

  const stale = await getStaleParkedLoops(db, userId);
  if (stale.length === 0) return { show: false, loops: [] };

  if (user.lastResurfaceShownAt) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (user.lastResurfaceShownAt > weekAgo) {
      return { show: false, loops: [] };
    }
  }

  return { show: true, loops: stale.map(toLoopDTO) };
}

export async function markResurfaceShown(db: Db, userId: string) {
  await db
    .update(users)
    .set({ lastResurfaceShownAt: new Date() })
    .where(eq(users.id, userId));
}

export function computeWeekStats(
  events: { toState: string; fromState: string | null }[],
  loops: { category: string | null }[]
) {
  const opened = events.filter((e) => e.fromState === null).length;
  const released = events.filter((e) => e.toState === "released").length;
  const done = events.filter((e) => e.toState === "done").length;
  const parked = events.filter((e) => e.toState === "parked").length;

  const categoryCounts: Record<string, number> = {};
  loops.forEach((l) => {
    const cat = l.category ?? "other";
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  });

  const dominantCategory =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other";

  return { opened, released, done, parked, dominantCategory };
}

export function isUserDueForWeeklySummary(
  timezone: string,
  targetHour = 18,
  targetDay = 0
): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "numeric",
      weekday: "short",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const weekday = parts.find((p) => p.type === "weekday")?.value;
    const dayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    return dayMap[weekday ?? ""] === targetDay && hour === targetHour;
  } catch {
    return false;
  }
}

export function getWeekStart(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
