import { NextResponse } from "next/server";
import { and, eq, isNull, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { sendTrialReminderEmail } from "@/lib/email/trial-reminder";

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

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() + 1);
  windowStart.setHours(0, 0, 0, 0);

  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 3);
  windowEnd.setHours(23, 59, 59, 999);

  const candidates = await db.query.users.findMany({
    where: and(
      eq(users.subscriptionStatus, "trialing"),
      isNull(users.trialReminderSentAt),
      gte(users.trialEndsAt, windowStart),
      lte(users.trialEndsAt, windowEnd)
    ),
  });

  let sent = 0;

  for (const user of candidates) {
    if (!user.trialEndsAt) continue;

    const result = await sendTrialReminderEmail(user.email, user.trialEndsAt);
    if (result.ok) {
      await db
        .update(users)
        .set({ trialReminderSentAt: new Date() })
        .where(eq(users.id, user.id));
      sent++;
    }
  }

  return NextResponse.json({ sent, checked: candidates.length });
}
