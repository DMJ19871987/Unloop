CREATE TYPE "public"."loop_state" AS ENUM('open_attention', 'next_step_known', 'parked', 'released', 'done');--> statement-breakpoint
CREATE TYPE "public"."loop_category" AS ENUM('people', 'decisions', 'logistics', 'home', 'work', 'money', 'health', 'ideas', 'other');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"timezone" text DEFAULT 'Europe/London',
	"checkin_hour" integer DEFAULT 20,
	"microsteps_enabled" boolean DEFAULT false,
	"weekly_email_enabled" boolean DEFAULT false,
	"notification_frequency" real DEFAULT 1,
	"stripe_customer_id" text,
	"subscription_status" text DEFAULT 'trialing',
	"trial_ends_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "offload_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"input_mode" text NOT NULL,
	"transcript" text,
	"duration_seconds" integer,
	"loops_extracted" integer DEFAULT 0,
	"loops_matched" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"state" "loop_state" DEFAULT 'open_attention' NOT NULL,
	"category" "loop_category" DEFAULT 'other',
	"weight" integer DEFAULT 3 NOT NULL,
	"emotional_intensity" integer DEFAULT 2 NOT NULL,
	"next_step" text,
	"mention_count" integer DEFAULT 1,
	"visual_seed" integer NOT NULL,
	"resurface_after" timestamp,
	"first_session_id" uuid,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loop_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loop_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"from_state" "loop_state",
	"to_state" "loop_state" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weekly_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" timestamp NOT NULL,
	"summary_text" text NOT NULL,
	"stats" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_usage_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" text NOT NULL,
	"operation" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"audio_seconds" integer,
	"est_cost_usd" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "founding_member_counter" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"sold_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offload_sessions" ADD CONSTRAINT "offload_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loops" ADD CONSTRAINT "loops_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loops" ADD CONSTRAINT "loops_first_session_id_offload_sessions_id_fk" FOREIGN KEY ("first_session_id") REFERENCES "public"."offload_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loop_events" ADD CONSTRAINT "loop_events_loop_id_loops_id_fk" FOREIGN KEY ("loop_id") REFERENCES "public"."loops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loop_events" ADD CONSTRAINT "loop_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_summaries" ADD CONSTRAINT "weekly_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "offload_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "loops_user_state_idx" ON "loops" USING btree ("user_id","state");--> statement-breakpoint
CREATE INDEX "loops_resurface_idx" ON "loops" USING btree ("user_id","resurface_after");--> statement-breakpoint
CREATE INDEX "events_user_idx" ON "loop_events" USING btree ("user_id","created_at");
