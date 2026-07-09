ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "keep_transcripts" boolean DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "crisis_card_shown_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_complete" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sessions_completed" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "push_subscription" jsonb;
