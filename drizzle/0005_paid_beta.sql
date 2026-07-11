CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "received_at" timestamp DEFAULT now() NOT NULL,
  "processed_at" timestamp,
  "failure_summary" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lifecycle_deliveries" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "job_type" text NOT NULL,
  "last_attempt_at" timestamp,
  "last_success_at" timestamp,
  "failure_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lifecycle_deliveries_user_idx" ON "lifecycle_deliveries" ("user_id", "job_type");
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "free_offload_used" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "free_activation_complete" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "offload_sessions" ADD COLUMN IF NOT EXISTS "session_outcome" text;
--> statement-breakpoint
ALTER TABLE "offload_sessions" ADD COLUMN IF NOT EXISTS "session_outcome_at" timestamp;
