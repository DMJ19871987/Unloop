import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { stripeWebhookEvents, users } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/config";
import {
  reconcileFromCheckoutSession,
  reconcileFromSubscription,
} from "@/lib/billing/reconcile-subscription";
import { trackServer } from "@/lib/analytics-server";

async function claimEvent(
  db: NonNullable<ReturnType<typeof getDb>>,
  event: Stripe.Event
): Promise<"new" | "duplicate" | "retry"> {
  const existing = await db.query.stripeWebhookEvents.findFirst({
    where: eq(stripeWebhookEvents.id, event.id),
  });
  if (existing?.processedAt) return "duplicate";
  if (existing) return "retry";

  await db.insert(stripeWebhookEvents).values({
    id: event.id,
    eventType: event.type,
  });
  return "new";
}

async function markProcessed(
  db: NonNullable<ReturnType<typeof getDb>>,
  eventId: string
) {
  await db
    .update(stripeWebhookEvents)
    .set({ processedAt: new Date(), failureSummary: null })
    .where(eq(stripeWebhookEvents.id, eventId));
}

async function markFailed(
  db: NonNullable<ReturnType<typeof getDb>>,
  eventId: string,
  summary: string
) {
  await db
    .update(stripeWebhookEvents)
    .set({ failureSummary: summary.slice(0, 500) })
    .where(eq(stripeWebhookEvents.id, eventId));
}

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

  const claim = await claimEvent(db, event);
  if (claim === "duplicate") {
    console.info(`stripe_webhook duplicate event_id=${event.id} type=${event.type}`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await reconcileFromCheckoutSession(db, stripe, session);
        if (result) {
          const user = await db.query.users.findFirst({
            where: eq(users.id, result.userId),
          });
          if (user && result.subscriptionStatus === "trialing") {
            await trackServer("trial_started", user.clerkId, {
              plan: session.metadata?.plan ?? "annual",
            });
          }
          if (user) {
            await trackServer("checkout_completed", user.clerkId, {
              plan: session.metadata?.plan,
            });
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const prior = await db.query.users.findFirst({
          where: eq(users.stripeCustomerId, subscription.customer as string),
        });
        const result = await reconcileFromSubscription(db, subscription);
        if (prior && result) {
          if (
            event.type === "customer.subscription.updated" &&
            result.subscriptionStatus === "active" &&
            prior.subscriptionStatus !== "active"
          ) {
            await trackServer("subscription_converted", prior.clerkId, {
              plan: subscription.metadata?.plan,
            });
          }
          if (event.type === "customer.subscription.deleted") {
            await trackServer("subscription_canceled", prior.clerkId);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          const user = await db.query.users.findFirst({
            where: eq(users.stripeCustomerId, invoice.customer as string),
          });
          if (user) {
            await db
              .update(users)
              .set({
                subscriptionStatus: "past_due",
                pastDueSince: user.pastDueSince ?? new Date(),
              })
              .where(eq(users.id, user.id));
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription && invoice.customer) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          await reconcileFromSubscription(db, subscription);
        }
        break;
      }
    }

    await markProcessed(db, event.id);
    console.info(`stripe_webhook processed event_id=${event.id} type=${event.type}`);
  } catch (error) {
    const summary = error instanceof Error ? error.message : "processing failed";
    await markFailed(db, event.id, summary);
    console.error(`stripe_webhook failed event_id=${event.id} type=${event.type}`);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
