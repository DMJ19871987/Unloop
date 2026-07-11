import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { lifecycleDeliveries } from "@/lib/db/schema";
import { isStripeConfigured } from "@/lib/stripe/config";
import { isEmailConfigured } from "@/lib/email/weekly";
import { isMockTranscribeEnabled } from "@/lib/ai/transcribe";

function checkAdminAuth(request: Request): boolean {
  const secret = process.env.HEALTH_ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const db = getDb();
  let lastLifecycleRun: string | null = null;

  if (db) {
    const last = await db.query.lifecycleDeliveries.findFirst({
      orderBy: [desc(lifecycleDeliveries.lastAttemptAt)],
    });
    lastLifecycleRun = last?.lastAttemptAt?.toISOString() ?? null;
  }

  const mockAi = isMockTranscribeEnabled();
  const stripeOk = isStripeConfigured() && Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const emailOk = isEmailConfigured();
  const dbOk = Boolean(process.env.DATABASE_URL);
  const clerkSecret = process.env.CLERK_SECRET_KEY ?? "";
  const clerkPublishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const clerkOk = Boolean(clerkSecret && clerkPublishable);
  const clerkProduction =
    clerkOk &&
    !clerkSecret.startsWith("sk_test_") &&
    !clerkPublishable.startsWith("pk_test_");
  const analyticsOk = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

  const healthy =
    dbOk &&
    clerkOk &&
    (process.env.NODE_ENV !== "production" || clerkProduction) &&
    stripeOk &&
    !mockAi &&
    (process.env.NODE_ENV !== "production" || emailOk);

  return NextResponse.json({
    status: healthy ? "ok" : "degraded",
    checkedAt: new Date().toISOString(),
    config: {
      database: dbOk,
      clerk: clerkOk,
      clerkProduction,
      stripe: stripeOk,
      email: emailOk,
      analytics: analyticsOk,
      mockAi,
      cronSecret: Boolean(process.env.CRON_SECRET),
    },
    scheduler: {
      lastLifecycleAttempt: lastLifecycleRun,
    },
  });
}
