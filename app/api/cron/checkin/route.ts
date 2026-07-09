import { NextResponse } from "next/server";
import type webpush from "web-push";
import { getDb } from "@/lib/db/client";
import { sendCheckinNotification } from "@/lib/push/send";

function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: "No database." }, { status: 503 });

  const allUsers = await db.query.users.findMany();
  let sent = 0;

  for (const user of allUsers) {
    if (!user.pushSubscription || user.checkinHour === null) continue;

    try {
      const tz = user.timezone ?? "Europe/London";
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      });
      const hour = parseInt(formatter.format(new Date()), 10);
      const targetHour = user.checkinHour ?? 20;

      if (hour !== targetHour) continue;

      const ok = await sendCheckinNotification(
        user.pushSubscription as webpush.PushSubscription,
        user.notificationFrequency ?? 1
      );
      if (ok) sent++;
    } catch {
      // Skip failed sends
    }
  }

  return NextResponse.json({ sent });
}
