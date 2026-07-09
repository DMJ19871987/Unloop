# Unloop

A voice-first mental offload app. Speak freely; Unloop turns the swirl into a calm field of open loops.

## Development

```bash
pnpm install
cp .env.example .env.local
# Add your keys to .env.local
pnpm db:push    # Apply schema to Neon
pnpm seed       # Seed demo data
pnpm dev
```

## Phase 1 status

Foundation: scaffold, theme, Drizzle schema, Clerk, Stripe checkout/webhooks, landing page with HeroFieldDemo.

## Phase 2 status

Core loop: capture, transcribe/extract pipeline, loop field, detail sheet, session summary.

## Phase 3 status

Compounding layer: Record view with cumulative counter, weekly summaries (cron + Claude + Resend email), parked-loop resurfacing banner.

## Phase 4 status

Retention & polish: PWA (Serwist service worker + manifest + install prompt), web push check-in cron with "quieter please", full settings (export, delete, transcript toggle, dark mode, billing portal), crisis card, label edit & merge, release-pass banner at 25+ loops, focus-trapped sheets, rate limiting on AI routes.

Set `NEXT_PUBLIC_PRELAUNCH=true` for waitlist mode.

## Tech stack

Next.js App Router · TypeScript · Tailwind · Neon + Drizzle · Clerk · Stripe · Anthropic · OpenAI Whisper · Vercel · PWA (Serwist, Phase 4)
