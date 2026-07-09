import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return stripeClient;
}

export const STRIPE_PRICES = {
  annual: {
    amount: 3499,
    currency: "gbp",
    interval: "year" as const,
    lookupKey: "unloop_annual",
    name: "Unloop Annual",
    trialDays: 7,
  },
  monthly: {
    amount: 499,
    currency: "gbp",
    interval: "month" as const,
    lookupKey: "unloop_monthly",
    name: "Unloop Monthly",
    trialDays: 7,
  },
  lifetime: {
    amount: 7900,
    currency: "gbp",
    lookupKey: "unloop_lifetime",
    name: "Unloop Founding Member",
    cap: 200,
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PRICES;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isPrelaunch(): boolean {
  return process.env.NEXT_PUBLIC_PRELAUNCH === "true";
}
