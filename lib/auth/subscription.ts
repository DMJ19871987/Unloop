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
    if (!user.trialEndsAt) {
      if (!user.freeOffloadUsed) return "full";
      if (!user.freeActivationComplete) return "full";
      return "read_only";
    }
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

export function canUseFreeOffload(user: UserRow): boolean {
  return (
    !user.trialEndsAt &&
    !user.freeOffloadUsed &&
    (user.subscriptionStatus ?? "trialing") === "trialing"
  );
}

export function needsCheckout(user: UserRow): boolean {
  return (
    !user.trialEndsAt &&
    (user.subscriptionStatus ?? "trialing") === "trialing" &&
    user.freeOffloadUsed &&
    user.freeActivationComplete
  );
}

export const WRITE_BLOCKED_MESSAGE =
  "Your subscription has lapsed. Your loops are safe — renew to keep offloading.";

export const FREE_OFFLOAD_MESSAGE =
  "You have used your free session. Choose a plan to keep offloading.";
