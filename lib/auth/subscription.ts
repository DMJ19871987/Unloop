import type { users } from "@/lib/db/schema";

export type SubscriptionAccess = "full" | "read_only" | "blocked";

const GRACE_DAYS = 7;

type UserRow = typeof users.$inferSelect;

export function getSubscriptionAccess(user: UserRow): SubscriptionAccess {
  const status = user.subscriptionStatus ?? "trialing";

  if (status === "active" || status === "lifetime") {
    return "full";
  }

  if (status === "trialing") {
    // trialEndsAt is only set by the Stripe webhook after checkout completes.
    // A trialing user without it has never finished checkout.
    if (!user.trialEndsAt) return "blocked";
    return user.trialEndsAt > new Date() ? "full" : "read_only";
  }

  if (status === "past_due") {
    if (!user.pastDueSince) return "read_only";
    const graceEnd = new Date(user.pastDueSince);
    graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);
    return graceEnd > new Date() ? "read_only" : "blocked";
  }

  return "blocked";
}

export const WRITE_BLOCKED_MESSAGE =
  "Your subscription has lapsed. Your loops are safe — renew to keep offloading.";
