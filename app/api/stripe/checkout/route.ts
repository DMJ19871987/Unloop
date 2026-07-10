import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import Stripe from "stripe";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { foundingMemberCounter, users } from "@/lib/db/schema";
import { getStripe, STRIPE_PRICES, type PlanKey } from "@/lib/stripe/config";

const bodySchema = z.object({
  plan: z.enum(["annual", "monthly", "lifetime"]),
});

async function getOrCreatePriceId(stripe: NonNullable<ReturnType<typeof getStripe>>, plan: PlanKey) {
  const config = STRIPE_PRICES[plan];
  const existing = await stripe.prices.list({
    lookup_keys: [config.lookupKey],
    limit: 1,
  });

  if (existing.data[0]) {
    return existing.data[0].id;
  }

  if (plan === "lifetime") {
    const product = await stripe.products.create({
      name: config.name,
      metadata: { plan: "lifetime" },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: config.amount,
      currency: config.currency,
      lookup_key: config.lookupKey,
    });
    return price.id;
  }

  const subPlan = plan as "annual" | "monthly";
  const subConfig = STRIPE_PRICES[subPlan];
  const product = await stripe.products.create({
    name: subConfig.name,
    metadata: { plan: subPlan },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: subConfig.amount,
    currency: subConfig.currency,
    recurring: { interval: subConfig.interval },
    lookup_key: subConfig.lookupKey,
  });

  return price.id;
}

async function handleCheckout(plan: PlanKey) {
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!stripe) {
    return NextResponse.json(
      { error: "Payments are not configured yet. Add Stripe keys to continue." },
      { status: 503 }
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-up", appUrl));
  }

  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Could not create user." }, { status: 500 });
  }

  const db = getDb();

  if (plan === "lifetime" && db) {
    const counter = await db.query.foundingMemberCounter.findFirst({
      where: eq(foundingMemberCounter.id, "default"),
    });
    const sold = counter?.soldCount ?? 0;
    if (sold >= STRIPE_PRICES.lifetime.cap) {
      return NextResponse.json({
        error: "Founding Member places are full.",
        remaining: 0,
      }, { status: 400 });
    }
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { clerkId: user.clerkId, userId: user.id },
    });
    customerId = customer.id;
    if (db) {
      await db
        .update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, user.id));
    }
  }

  const priceId = await getOrCreatePriceId(stripe, plan);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: plan === "lifetime" ? "payment" : "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/onboarding?checkout=success`,
    cancel_url: `${appUrl}/subscribe?checkout=cancelled`,
    payment_method_collection: "always",
    automatic_tax: { enabled: true },
    metadata: {
      userId: user.id,
      plan,
    },
  };

  if (plan !== "lifetime") {
    sessionParams.subscription_data = {
      trial_period_days: STRIPE_PRICES[plan].trialDays,
      metadata: { plan },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  let remaining: number | undefined;
  if (plan === "lifetime" && db) {
    const counter = await db.query.foundingMemberCounter.findFirst({
      where: eq(foundingMemberCounter.id, "default"),
    });
    remaining = STRIPE_PRICES.lifetime.cap - (counter?.soldCount ?? 0);
  }

  return NextResponse.json({ url: session.url, remaining });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan } = bodySchema.parse(body);
    return handleCheckout(plan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }
    return NextResponse.json({ error: "Checkout failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const plan = (searchParams.get("plan") ?? "annual") as PlanKey;

  if (!["annual", "monthly", "lifetime"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const result = await handleCheckout(plan);
  const data = await result.json();

  if (data.url) {
    return NextResponse.redirect(data.url);
  }

  return NextResponse.json(data, { status: result.status });
}
