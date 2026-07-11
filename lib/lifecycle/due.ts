import { getWeekStartInTz } from "@/lib/loops/record";

const DAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface LocalTimeParts {
  hour: number;
  weekday: number;
  year: number;
  month: number;
  day: number;
  dateKey: string;
}

export function getLocalTimeParts(timezone: string, now = new Date()): LocalTimeParts | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "numeric",
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const weekday = DAY_MAP[get("weekday")] ?? 0;
    const year = Number(get("year"));
    const month = Number(get("month"));
    const day = Number(get("day"));
    const hour = parseInt(get("hour"), 10);
    return {
      hour,
      weekday,
      year,
      month,
      day,
      dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    };
  } catch {
    return null;
  }
}

/** True when local hour is at or past target within a grace window (default 3h). */
export function isHourDue(
  timezone: string,
  targetHour: number,
  graceHours = 3,
  now = new Date()
): boolean {
  const local = getLocalTimeParts(timezone, now);
  if (!local) return false;
  return local.hour >= targetHour && local.hour < targetHour + graceHours;
}

export function isSameLocalDay(a: Date, b: Date, tz: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(a) === fmt.format(b);
}

export function isCheckinDue(
  timezone: string,
  checkinHour: number,
  lastSentAt: Date | null,
  now = new Date()
): boolean {
  if (!isHourDue(timezone, checkinHour, 3, now)) return false;
  if (lastSentAt && isSameLocalDay(lastSentAt, now, timezone)) return false;
  return true;
}

export function isWeeklySummaryDue(
  timezone: string,
  targetHour = 18,
  targetDay = 0,
  now = new Date()
): boolean {
  const local = getLocalTimeParts(timezone, now);
  if (!local) return false;
  if (local.weekday !== targetDay) return false;
  return isHourDue(timezone, targetHour, 4, now);
}

export function weeklySummaryDeliveryKey(userId: string, timezone: string, now = new Date()): string {
  const weekStart = getWeekStartInTz(timezone, now);
  return `weekly-summary:${userId}:${weekStart.toISOString().slice(0, 10)}`;
}

export function isTrialReminderDue(
  trialEndsAt: Date,
  reminderSentAt: Date | null,
  now = new Date()
): boolean {
  if (reminderSentAt) return false;
  const daysUntilEnd = (trialEndsAt.getTime() - now.getTime()) / 86400000;
  return daysUntilEnd >= 1 && daysUntilEnd <= 3;
}

export function trialReminderDeliveryKey(userId: string, trialEndsAt: Date): string {
  const endDate = trialEndsAt.toISOString().slice(0, 10);
  return `trial-reminder:${userId}:${endDate}:2d`;
}
