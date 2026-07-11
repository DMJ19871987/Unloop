# Paid beta deployment

Effective: July 2026

This checklist covers environment configuration for the paid beta. Never commit secret values.

## Required environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk authentication (client) |
| `CLERK_SECRET_KEY` | Clerk authentication (server) |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL for redirects and emails |
| `CRON_SECRET` | Bearer token for `/api/cron/*` and lifecycle sweep |
| `RESEND_API_KEY` | Trial reminders and optional weekly emails |
| `OPENAI_API_KEY` | Transcription (Whisper) |
| `ANTHROPIC_API_KEY` | Loop extraction |
| `MOCK_AI` | Must be `false` in production |

## Optional

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Consented analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog region (default EU) |
| `HEALTH_ADMIN_SECRET` | Admin health endpoint (falls back to `CRON_SECRET`) |
| `NEXT_PUBLIC_PRELAUNCH` | Set `false` when accepting payments |

## Resend setup

1. Verify sending domain `unloop.app` in Resend.
2. Set from-address `hello@unloop.app`.
3. Confirm trial-reminder and weekly-summary test sends in staging.

## Scheduler

The Vercel Hobby cron runs `/api/cron/lifecycle` once daily as a fallback.

For timely check-ins and weekly summaries, configure an **external hourly scheduler** (e.g. cron-job.org, GitHub Actions, or your own worker) to call:

```
GET https://<your-domain>/api/cron/lifecycle
Authorization: Bearer <CRON_SECRET>
```

Paginate with `?cursor=<userId>` until `completed: true` in the JSON response.

Monitor freshness via `GET /api/health` with the same bearer token.

## Stripe

1. Create monthly (£4.99) and annual (£34.99) prices with lookup keys `unloop_monthly` and `unloop_annual`.
2. Configure webhook endpoint `/api/stripe/webhook` for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
3. Run one test-mode checkout and one controlled live low-value transaction before inviting beta users.

## Hosting constraint

Confirm your hosting plan permits commercial use before accepting the first payment. The Hobby plan may not be suitable for commercial billing.

## Release checklist

- [ ] Signed-out plan → sign-up → subscribe → checkout works in production
- [ ] Checkout success survives delayed webhook (onboarding polling)
- [ ] Account deletion cancels Stripe before deleting data
- [ ] Webhook replay produces no duplicate side effects
- [ ] One free full offload works; failed attempts do not consume it
- [ ] Resend domain verified; trial reminders sending
- [ ] External scheduler calling lifecycle endpoint; freshness visible in health
- [ ] Analytics consent works; decline sends no PostHog traffic
- [ ] Privacy notice and offline audio wording match production
- [ ] `MOCK_AI=false` and health endpoint reports `status: ok`
- [ ] CI passes on clean checkout
