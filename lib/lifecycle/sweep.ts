import { eq, and, gte } from "drizzle-orm";
import type webpush from "web-push";
import type { Db } from "@/lib/db/client";
import {
  users,
  loopEvents,
  loops,
  weeklySummaries,
  lifecycleDeliveries,
} from "@/lib/db/schema";
import { generateWeeklySummary } from "@/lib/ai/generate-weekly";
import {
  computeWeekStats,
  getWeekStartInTz,
} from "@/lib/loops/record";
import { sendWeeklySummaryEmail } from "@/lib/email/weekly";
import { sendTrialReminderEmail } from "@/lib/email/trial-reminder";
import { sendCheckinNotification } from "@/lib/push/send";
import {
  isCheckinDue,
  isWeeklySummaryDue,
  isTrialReminderDue,
  weeklySummaryDeliveryKey,
  trialReminderDeliveryKey,
} from "./due";

const BATCH_SIZE = 50;

export interface LifecycleSweepResult {
  processed: number;
  checkins: number;
  weeklySummaries: number;
  trialReminders: number;
  failures: number;
  cursor: string | null;
}

async function hasSuccessfulDelivery(db: Db, deliveryId: string): Promise<boolean> {
  const row = await db.query.lifecycleDeliveries.findFirst({
    where: eq(lifecycleDeliveries.id, deliveryId),
  });
  return Boolean(row?.lastSuccessAt);
}

async function recordAttempt(
  db: Db,
  deliveryId: string,
  userId: string,
  jobType: string,
  success: boolean
) {
  const now = new Date();
  const existing = await db.query.lifecycleDeliveries.findFirst({
    where: eq(lifecycleDeliveries.id, deliveryId),
  });

  if (existing) {
    await db
      .update(lifecycleDeliveries)
      .set({
        lastAttemptAt: now,
        lastSuccessAt: success ? now : existing.lastSuccessAt,
        failureCount: success ? existing.failureCount : existing.failureCount + 1,
      })
      .where(eq(lifecycleDeliveries.id, deliveryId));
    return;
  }

  await db.insert(lifecycleDeliveries).values({
    id: deliveryId,
    userId,
    jobType,
    lastAttemptAt: now,
    lastSuccessAt: success ? now : null,
    failureCount: success ? 0 : 1,
  });
}

async function processCheckin(
  db: Db,
  user: typeof users.$inferSelect
): Promise<boolean> {
  if (!user.pushSubscription || user.checkinHour === null) return false;
  const tz = user.timezone ?? "Europe/London";
  if (!isCheckinDue(tz, user.checkinHour, user.lastCheckinSentAt)) return false;

  const deliveryId = `checkin:${user.id}:${new Date().toISOString().slice(0, 10)}`;
  if (await hasSuccessfulDelivery(db, deliveryId)) return false;

  const ok = await sendCheckinNotification(
    user.pushSubscription as webpush.PushSubscription,
    user.notificationFrequency ?? 1
  );
  await recordAttempt(db, deliveryId, user.id, "checkin", ok);
  if (ok) {
    await db
      .update(users)
      .set({ lastCheckinSentAt: new Date() })
      .where(eq(users.id, user.id));
  }
  return ok;
}

async function processWeeklySummary(
  db: Db,
  user: typeof users.$inferSelect
): Promise<boolean> {
  const tz = user.timezone ?? "Europe/London";
  if (!isWeeklySummaryDue(tz)) return false;

  const deliveryId = weeklySummaryDeliveryKey(user.id, tz);
  if (await hasSuccessfulDelivery(db, deliveryId)) return false;

  const weekStart = getWeekStartInTz(tz);
  const existing = await db.query.weeklySummaries.findFirst({
    where: and(
      eq(weeklySummaries.userId, user.id),
      gte(weeklySummaries.weekStart, weekStart)
    ),
  });
  if (existing) {
    await recordAttempt(db, deliveryId, user.id, "weekly-summary", true);
    return true;
  }

  const events = await db.query.loopEvents.findMany({
    where: and(eq(loopEvents.userId, user.id), gte(loopEvents.createdAt, weekStart)),
    with: { loop: true },
  });
  if (events.length === 0) return false;

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

  let emailOk = true;
  if (user.weeklyEmailEnabled) {
    emailOk = await sendWeeklySummaryEmail(user.email, summaryText, user.id);
  }

  const ok = emailOk;
  await recordAttempt(db, deliveryId, user.id, "weekly-summary", ok);
  return ok;
}

async function processTrialReminder(
  db: Db,
  user: typeof users.$inferSelect
): Promise<boolean> {
  if (user.subscriptionStatus !== "trialing" || !user.trialEndsAt) return false;
  if (!isTrialReminderDue(user.trialEndsAt, user.trialReminderSentAt)) return false;

  const deliveryId = trialReminderDeliveryKey(user.id, user.trialEndsAt);
  if (await hasSuccessfulDelivery(db, deliveryId)) return false;

  const result = await sendTrialReminderEmail(user.email, user.trialEndsAt, user.id);
  await recordAttempt(db, deliveryId, user.id, "trial-reminder", result.ok);
  if (result.ok) {
    await db
      .update(users)
      .set({ trialReminderSentAt: new Date() })
      .where(eq(users.id, user.id));
  }
  return result.ok;
}

export async function runLifecycleSweep(
  db: Db,
  cursor?: string | null
): Promise<LifecycleSweepResult> {
  const allUsers = await db.query.users.findMany({
    orderBy: (u, { asc }) => [asc(u.id)],
  });

  let startIdx = 0;
  if (cursor) {
    const idx = allUsers.findIndex((u) => u.id === cursor);
    startIdx = idx >= 0 ? idx + 1 : 0;
  }

  const batch = allUsers.slice(startIdx, startIdx + BATCH_SIZE);
  let checkins = 0;
  let weeklySummaries = 0;
  let trialReminders = 0;
  let failures = 0;

  for (const user of batch) {
    try {
      if (await processCheckin(db, user)) checkins++;
      if (await processWeeklySummary(db, user)) weeklySummaries++;
      if (await processTrialReminder(db, user)) trialReminders++;
    } catch {
      failures++;
    }
  }

  const nextCursor =
    startIdx + BATCH_SIZE < allUsers.length
      ? batch[batch.length - 1]?.id ?? null
      : null;

  return {
    processed: batch.length,
    checkins,
    weeklySummaries,
    trialReminders,
    failures,
    cursor: nextCursor,
  };
}
