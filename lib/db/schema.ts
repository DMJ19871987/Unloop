import { pgTable, uuid, text, integer, real, timestamp, boolean, jsonb, pgEnum, index } from "drizzle-orm/pg-core";

export const loopState = pgEnum("loop_state", [
  "open_attention",
  "next_step_known",
  "parked",
  "released",
  "done",
]);

export const loopCategory = pgEnum("loop_category", [
  "people",
  "decisions",
  "logistics",
  "home",
  "work",
  "money",
  "health",
  "ideas",
  "other",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  timezone: text("timezone").default("Europe/London"),
  checkinHour: integer("checkin_hour").default(20),
  microstepsEnabled: boolean("microsteps_enabled").default(false),
  weeklyEmailEnabled: boolean("weekly_email_enabled").default(false),
  notificationFrequency: real("notification_frequency").default(1.0),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionStatus: text("subscription_status").default("trialing"),
  trialEndsAt: timestamp("trial_ends_at"),
  lastResurfaceShownAt: timestamp("last_resurface_shown_at"),
  keepTranscripts: boolean("keep_transcripts").default(true),
  crisisCardShownAt: timestamp("crisis_card_shown_at"),
  onboardingComplete: boolean("onboarding_complete").default(false),
  sessionsCompleted: integer("sessions_completed").default(0),
  pushSubscription: jsonb("push_subscription"),
  pastDueSince: timestamp("past_due_since"),
  lastCheckinSentAt: timestamp("last_checkin_sent_at"),
  trialReminderSentAt: timestamp("trial_reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const offloadSessions = pgTable(
  "offload_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    inputMode: text("input_mode").notNull(),
    transcript: text("transcript"),
    durationSeconds: integer("duration_seconds"),
    loopsExtracted: integer("loops_extracted").default(0),
    loopsMatched: integer("loops_matched").default(0),
    crisis: boolean("crisis").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId, t.createdAt)]
);

export const loops = pgTable(
  "loops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    label: text("label").notNull(),
    state: loopState("state").notNull().default("open_attention"),
    category: loopCategory("category").default("other"),
    weight: integer("weight").notNull().default(3),
    emotionalIntensity: integer("emotional_intensity").notNull().default(2),
    nextStep: text("next_step"),
    mentionCount: integer("mention_count").default(1),
    visualSeed: integer("visual_seed").notNull(),
    resurfaceAfter: timestamp("resurface_after"),
    firstSessionId: uuid("first_session_id").references(() => offloadSessions.id),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("loops_user_state_idx").on(t.userId, t.state),
    index("loops_resurface_idx").on(t.userId, t.resurfaceAfter),
  ]
);

export const loopEvents = pgTable(
  "loop_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    loopId: uuid("loop_id")
      .references(() => loops.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    fromState: loopState("from_state"),
    toState: loopState("to_state").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("events_user_idx").on(t.userId, t.createdAt)]
);

export const weeklySummaries = pgTable("weekly_summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  weekStart: timestamp("week_start").notNull(),
  summaryText: text("summary_text").notNull(),
  stats: jsonb("stats").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiUsageLog = pgTable("ai_usage_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  operation: text("operation").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  audioSeconds: integer("audio_seconds"),
  estCostUsd: real("est_cost_usd"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const waitlist = pgTable("waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const foundingMemberCounter = pgTable("founding_member_counter", {
  id: text("id").primaryKey().default("default"),
  soldCount: integer("sold_count").notNull().default(0),
});
