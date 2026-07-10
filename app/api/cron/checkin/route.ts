import { NextResponse } from "next/server";
import type webpush from "web-push";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { sendCheckinNotification } from "@/lib/push/send";

function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function isSameLocalDay(a: Date, b: Date, tz: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(a) === fmt.format(b);
}

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: "No database." }, { status: 503 });

  const allUsers = await db.query.users.findMany();
  let sent = 0;
  const now = new Date();

  for (const user of allUsers) {
    if (!user.pushSubscription || user.checkinHour === null) continue;

    try {
      const tz = user.timezone ?? "Europe/London";
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      });
      const hour = parseInt(formatter.format(now), 10);
      const targetHour = user.checkinHour ?? 20;

      if (hour !== targetHour) continue;

      if (
        user.lastCheckinSentAt &&
        isSameLocalDay(user.lastCheckinSentAt, now, tz)
      ) {
        continue;
      }

      const ok = await sendCheckinNotification(
        user.pushSubscription as webpush.PushSubscription,
        user.notificationFrequency ?? 1
      );
      if (ok) {
        await db
          .update(users)
          .set({ lastCheckinSentAt: now })
          .where(eq(users.id, user.id));
        sent++;
      }
    } catch {
      // Skip failed sends
    }
  }

  return NextResponse.json({ sent });
}
