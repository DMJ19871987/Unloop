import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/config";
import { cancelStripeBilling } from "@/lib/billing/reconcile-subscription";

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { getSubscriptionAccess: getAccess } = await import("@/lib/auth/subscription");

  return NextResponse.json({
    email: user.email,
    timezone: user.timezone,
    checkinHour: user.checkinHour,
    microstepsEnabled: user.microstepsEnabled,
    weeklyEmailEnabled: user.weeklyEmailEnabled,
    notificationFrequency: user.notificationFrequency,
    keepTranscripts: user.keepTranscripts,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionAccess: getAccess(user),
    stripeCustomerId: user.stripeCustomerId,
    trialEndsAt: user.trialEndsAt,
    sessionsCompleted: user.sessionsCompleted,
    onboardingComplete: user.onboardingComplete,
    freeOffloadUsed: user.freeOffloadUsed,
    freeActivationComplete: user.freeActivationComplete,
  });
}

export async function PATCH(request: Request) {
  const user = await getOrCreateUser();
  const db = getDb();
  if (!user || !db) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const body = await request.json();
  const updates: Partial<typeof users.$inferInsert> = {};

  if (body.checkinHour !== undefined) updates.checkinHour = body.checkinHour;
  if (body.microstepsEnabled !== undefined) updates.microstepsEnabled = body.microstepsEnabled;
  if (body.weeklyEmailEnabled !== undefined) updates.weeklyEmailEnabled = body.weeklyEmailEnabled;
  if (body.keepTranscripts !== undefined) updates.keepTranscripts = body.keepTranscripts;
  if (body.timezone !== undefined) updates.timezone = body.timezone;
  if (body.onboardingComplete !== undefined) updates.onboardingComplete = body.onboardingComplete;
  if (body.notificationFrequency !== undefined) updates.notificationFrequency = body.notificationFrequency;

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, user.id))
    .returning();

  return NextResponse.json({ user: updated });
}

export async function DELETE(request: Request) {
  const user = await getOrCreateUser();
  const db = getDb();
  if (!user || !db) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      { error: "Please confirm deletion by sending confirm: DELETE." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  if (stripe && user.stripeCustomerId) {
    const billing = await cancelStripeBilling(stripe, user.stripeCustomerId);
    if (!billing.ok) {
      console.error(`account_delete stripe_failed user_id=${user.id}`);
      return NextResponse.json(
        {
          error:
            "We could not cancel your billing yet. Your account and data are unchanged. Please try again or contact support.",
          code: "stripe_failed",
        },
        { status: 502 }
      );
    }
  }

  const { deletePostHogPerson, trackServer } = await import("@/lib/analytics-server");
  await trackServer("account_deleted", user.clerkId);

  await db.delete(users).where(eq(users.id, user.id));

  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    try {
      const { userId } = await auth();
      if (userId) {
        const { clerkClient } = await import("@clerk/nextjs/server");
        const client = await clerkClient();
        await client.users.deleteUser(userId);
      }
    } catch {
      console.error(`account_delete clerk_failed user_id=${user.id}`);
    }
  }

  await deletePostHogPerson(user.clerkId);
  console.info(`account_delete success user_id=${user.id}`);

  return NextResponse.json({ success: true });
}
