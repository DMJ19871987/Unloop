import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const DEV_CLERK_ID = "user_seed_demo_unloop";

export async function getOrCreateUser() {
  const db = getDb();
  if (!db) return null;

  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkKey) {
    const demo = await db.query.users.findFirst({
      where: eq(users.clerkId, DEV_CLERK_ID),
    });
    if (demo) return demo;
    const [created] = await db
      .insert(users)
      .values({
        clerkId: DEV_CLERK_ID,
        email: "demo@unloop.app",
        timezone: "Europe/London",
        subscriptionStatus: "active",
      })
      .returning();
    return created;
  }

  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) return null;

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (existing) return existing;

  // trialEndsAt is deliberately NOT set here — the Stripe webhook sets it when
  // checkout completes, and subscription access keys off its presence.
  const [created] = await db
    .insert(users)
    .values({
      clerkId: userId,
      email,
      timezone: "Europe/London",
    })
    .returning();

  return created;
}

export async function requireUser() {
  const user = await getOrCreateUser();
  if (!user) {
    throw new Error("Unauthorised");
  }
  return user;
}
