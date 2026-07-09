# Unloop

A voice-first mental offload app. Speak freely; Unloop turns the swirl into a calm field of open loops.

## Deployment

| Service | Status | URL / ID |
|---------|--------|----------|
| GitHub | Live | https://github.com/DMJ19871987/Unloop |
| Vercel | Live | https://unloop-kappa.vercel.app |
| Neon | Live | Project `unloop` (`empty-mountain-91503229`) |

### Vercel env vars configured

- `DATABASE_URL`, `CRON_SECRET`, `MOCK_AI=true`
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PRELAUNCH=false`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

### Still needed (add in Vercel → Settings → Environment Variables)

1. **Clerk** — create app at https://dashboard.clerk.com, add redirect URLs for `https://unloop-kappa.vercel.app`, then set:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
2. **Stripe** — from https://dashboard.stripe.com/apikeys, then create webhook → `https://unloop-kappa.vercel.app/api/stripe/webhook`:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
3. **AI** (optional — `MOCK_AI=true` works for demo): `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
4. **Email** (optional): `RESEND_API_KEY`

After adding keys, redeploy: `vercel --prod`

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
