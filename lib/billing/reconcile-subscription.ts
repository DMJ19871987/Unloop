import type Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { foundingMemberCounter, users } from "@/lib/db/schema";
import { STRIPE_PRICES } from "@/lib/stripe/config";

export interface ReconcileResult {
  userId: string;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
}

function mapSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): string {
  const statusMap: Record<string, string> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
  };
  return statusMap[stripeStatus] ?? "canceled";
}

/**
 * Idempotently apply checkout-session entitlement to the user row.
 * Safe to call from webhooks and checkout-status polling.
 */
export async function reconcileFromCheckoutSession(
  db: Db,
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<ReconcileResult | null> {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;
  if (!userId) return null;

  if (session.payment_status !== "paid") return null;

  if (plan === "lifetime") {
    await db
      .update(users)
      .set({ subscriptionStatus: "lifetime", pastDueSince: null })
      .where(eq(users.id, userId));

    await db
      .insert(foundingMemberCounter)
      .values({ id: "default", soldCount: 1 })
      .onConflictDoUpdate({
        target: foundingMemberCounter.id,
        set: { soldCount: sql`${foundingMemberCounter.soldCount} + 1` },
      });

    return { userId, subscriptionStatus: "lifetime", trialEndsAt: null };
  }

  if (!session.subscription) return null;

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const status = mapSubscriptionStatus(subscription.status);
  const trialEndsAt = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });

  await db
    .update(users)
    .set({
      subscriptionStatus: status,
      trialEndsAt,
      pastDueSince: status === "past_due" ? existing?.pastDueSince ?? new Date() : null,
    })
    .where(eq(users.id, userId));

  return { userId, subscriptionStatus: status, trialEndsAt };
}

/**
 * Reconcile entitlement from the current Stripe subscription object.
 * Used when out-of-order webhook events arrive.
 */
export async function reconcileFromSubscription(
  db: Db,
  subscription: Stripe.Subscription
): Promise<ReconcileResult | null> {
  const customerId = subscription.customer as string;
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  });
  if (!user) return null;

  const status = mapSubscriptionStatus(subscription.status);
  const trialEndsAt = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  await db
    .update(users)
    .set({
      subscriptionStatus: status,
      trialEndsAt,
      pastDueSince:
        status === "past_due" ? user.pastDueSince ?? new Date() : null,
    })
    .where(eq(users.id, user.id));

  return { userId: user.id, subscriptionStatus: status, trialEndsAt };
}

export async function cancelStripeBilling(
  stripe: Stripe,
  stripeCustomerId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 20,
    });

    for (const sub of subscriptions.data) {
      if (sub.status !== "canceled") {
        await stripe.subscriptions.cancel(sub.id);
      }
    }

    await stripe.customers.del(stripeCustomerId);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe error";
    return { ok: false, error: message };
  }
}
