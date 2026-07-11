import type { PlanKey } from "@/lib/stripe/config";

/** Public checkout plans available during paid beta (lifetime hidden from UI). */
export const PUBLIC_PLANS = ["annual", "monthly"] as const;
export type PublicPlan = (typeof PUBLIC_PLANS)[number];

export const BETA_HIDE_LIFETIME = true;

export function isPublicPlan(value: string | null | undefined): value is PublicPlan {
  return PUBLIC_PLANS.includes(value as PublicPlan);
}

export function parsePublicPlan(value: string | null | undefined): PublicPlan | null {
  return isPublicPlan(value) ? value : null;
}

export function parseCheckoutPlan(value: string | null | undefined): PlanKey | null {
  if (isPublicPlan(value)) return value;
  if (!BETA_HIDE_LIFETIME && value === "lifetime") return "lifetime";
  return null;
}

export function subscribeUrl(plan: PublicPlan): string {
  return `/subscribe?plan=${plan}`;
}

export function signUpUrl(plan: PublicPlan): string {
  return `/sign-up?plan=${plan}`;
}
