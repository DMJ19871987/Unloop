import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { subDays, subWeeks } from "./date-helpers";
import * as schema from "../lib/db/schema";
import { visualSeedFromLabel } from "../lib/loops/state";

const DEMO_CLERK_ID = "user_seed_demo_unloop";
const DEMO_EMAIL = "demo@unloop.app";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required. Copy .env.example to .env.local and add your Neon connection string.");
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  console.log("Seeding demo user with 3 weeks of loop history…");

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.clerkId, DEMO_CLERK_ID),
  });

  if (existing) {
    console.log("Demo user already exists. Skipping seed.");
    return;
  }

  const now = new Date();

  const [user] = await db
    .insert(schema.users)
    .values({
      clerkId: DEMO_CLERK_ID,
      email: DEMO_EMAIL,
      timezone: "Europe/London",
      subscriptionStatus: "active",
      trialEndsAt: subDays(now, 14),
    })
    .returning();

  const loopData = [
    { label: "Job application", category: "work" as const, weight: 5, emotionalIntensity: 4, state: "open_attention" as const },
    { label: "The garden", category: "home" as const, weight: 3, emotionalIntensity: 2, state: "open_attention" as const },
    { label: "Message Tom", category: "people" as const, weight: 4, emotionalIntensity: 3, state: "next_step_known" as const, nextStep: "Ask about Saturday" },
    { label: "Call the bank", category: "money" as const, weight: 3, emotionalIntensity: 2, state: "next_step_known" as const, nextStep: "Query the charge" },
    { label: "Reply to Sam", category: "people" as const, weight: 2, emotionalIntensity: 1, state: "parked" as const, parkedDaysAgo: 25 },
    { label: "Book flights", category: "logistics" as const, weight: 3, emotionalIntensity: 2, state: "parked" as const, parkedDaysAgo: 22 },
    { label: "Fix the shelf", category: "home" as const, weight: 2, emotionalIntensity: 1, state: "done" as const, closedDaysAgo: 5 },
    { label: "Dentist", category: "health" as const, weight: 2, emotionalIntensity: 1, state: "released" as const, closedDaysAgo: 12 },
    { label: "Old argument", category: "people" as const, weight: 2, emotionalIntensity: 3, state: "released" as const, closedDaysAgo: 18 },
    { label: "Mum's birthday", category: "people" as const, weight: 4, emotionalIntensity: 3, state: "open_attention" as const },
  ];

  const [session1] = await db
    .insert(schema.offloadSessions)
    .values({
      userId: user.id,
      inputMode: "voice",
      transcript: "I keep thinking about the job application and the garden…",
      durationSeconds: 142,
      loopsExtracted: 6,
      loopsMatched: 2,
      createdAt: subWeeks(now, 3),
    })
    .returning();

  const insertedLoops = [];
  for (const item of loopData) {
    const closedAt = item.closedDaysAgo
      ? subDays(now, item.closedDaysAgo)
      : null;

    const updatedAt =
      "parkedDaysAgo" in item && item.parkedDaysAgo
        ? subDays(now, item.parkedDaysAgo)
        : closedAt ?? now;

    const [loop] = await db
      .insert(schema.loops)
      .values({
        userId: user.id,
        label: item.label,
        state: item.state,
        category: item.category,
        weight: item.weight,
        emotionalIntensity: item.emotionalIntensity,
        nextStep: "nextStep" in item ? item.nextStep : null,
        mentionCount: item.state === "open_attention" ? 3 : 1,
        visualSeed: visualSeedFromLabel(item.label, user.id),
        firstSessionId: session1.id,
        closedAt,
        createdAt: subWeeks(now, 2),
        updatedAt,
      })
      .returning();

    insertedLoops.push(loop);

    await db.insert(schema.loopEvents).values({
      loopId: loop.id,
      userId: user.id,
      fromState: null,
      toState: "open_attention",
      createdAt: subWeeks(now, 2),
    });

    if (item.state !== "open_attention") {
      await db.insert(schema.loopEvents).values({
        loopId: loop.id,
        userId: user.id,
        fromState: "open_attention",
        toState: item.state,
        note: "nextStep" in item ? item.nextStep : null,
        createdAt: closedAt ?? subDays(now, 3),
      });
    }
  }

  for (let w = 0; w < 3; w++) {
    await db.insert(schema.weeklySummaries).values({
      userId: user.id,
      weekStart: subWeeks(now, 3 - w),
      summaryText:
        w === 0
          ? "Work loops dominated this week, but you released more than you opened. Decisions are what linger longest for you."
          : w === 1
            ? "A quieter week for logistics. Most loops left with a next step."
            : "People loops surfaced often. The job decision has now outlasted everything opened alongside it.",
      stats: {
        opened: 4 - w,
        released: 2 + w,
        done: 1,
        parked: 2,
        dominantCategory: w === 0 ? "work" : w === 1 ? "logistics" : "people",
      },
      createdAt: subWeeks(now, 2 - w),
    });
  }

  await db.insert(schema.foundingMemberCounter).values({ id: "default", soldCount: 0 }).onConflictDoNothing();

  console.log(`Seeded user ${user.id} with ${insertedLoops.length} loops and 3 weekly summaries.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
