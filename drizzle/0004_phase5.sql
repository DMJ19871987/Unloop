ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "past_due_since" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_checkin_sent_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_reminder_sent_at" timestamp;
