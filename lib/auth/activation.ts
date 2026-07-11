import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { trackServer } from "@/lib/analytics-server";

export async function markFreeActivationIfNeeded(
  db: Db,
  user: typeof users.$inferSelect,
  fromState: string | null,
  toState: string
) {
  if (user.trialEndsAt || !user.freeOffloadUsed || user.freeActivationComplete) {
    return;
  }
  if (fromState === toState) return;

  await db
    .update(users)
    .set({ freeActivationComplete: true })
    .where(eq(users.id, user.id));

  await trackServer("first_loop_action", user.clerkId, { from: fromState, to: toState });
}
