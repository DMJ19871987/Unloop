import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { foundingMemberCounter, users } from "@/lib/db/schema";
import { getStripe, STRIPE_PRICES } from "@/lib/stripe/config";

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const body = await request.text();
  const headerPayload = await headers();
  const signature = headerPayload.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;

      if (!userId) break;

      if (plan === "lifetime") {
        await db
          .update(users)
          .set({ subscriptionStatus: "lifetime" })
          .where(eq(users.id, userId));

        await db
          .insert(foundingMemberCounter)
          .values({ id: "default", soldCount: 1 })
          .onConflictDoUpdate({
            target: foundingMemberCounter.id,
            set: { soldCount: sql`${foundingMemberCounter.soldCount} + 1` },
          });
      } else if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await db
          .update(users)
          .set({
            subscriptionStatus: sub.status === "trialing" ? "trialing" : "active",
            trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          })
          .where(eq(users.id, userId));
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const statusMap: Record<string, string> = {
        trialing: "trialing",
        active: "active",
        past_due: "past_due",
        canceled: "canceled",
        unpaid: "past_due",
      };
      const status = statusMap[subscription.status] ?? "canceled";

      await db
        .update(users)
        .set({
          subscriptionStatus: status,
          trialEndsAt: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : null,
        })
        .where(eq(users.stripeCustomerId, customerId));
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await db
        .update(users)
        .set({ subscriptionStatus: "canceled" })
        .where(eq(users.stripeCustomerId, subscription.customer as string));
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.customer) {
        await db
          .update(users)
          .set({ subscriptionStatus: "past_due" })
          .where(eq(users.stripeCustomerId, invoice.customer as string));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
