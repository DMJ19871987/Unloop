# Unloop Paid Beta Launch Plan

Status: implementation handoff for Composer 2

This plan converts the July 2026 paid-readiness audit into an ordered build programme. It is intentionally narrower than a general product-improvement pass: preserve the current visual field and core loop model, and make the existing product safe, measurable, and dependable enough for a small paid beta.

This document supersedes the commercial-launch sections of `IMPLEMENTATION_PLAN.md` where the current code has already moved on.

## Launch position

- Target: a founder-led beta of 20-30 users.
- Current prices can remain GBP 4.99 monthly and GBP 34.99 annually.
- Hide the lifetime plan during the beta. Reconsider it only after retention, refund, and AI-cost data exists.
- Do not add collaboration, integrations, streaks, gamification, native apps, a generic AI coach, or a free-form canvas before this work is complete.
- Do not redesign the mental field again unless a task below specifically requires a state or feedback change.

## Hosting constraint

The implementation below deliberately excludes a Vercel plan upgrade, as requested. It must not imply that the Hobby plan is suitable for commercial use. Before charging users, either move to a hosting plan/provider that permits commercial use or confirm a compliant alternative. This is a go-live business constraint, not a Composer implementation task.

The scheduling work below avoids relying on frequent Vercel Hobby cron entries. It creates one idempotent lifecycle endpoint that can be called by an external scheduler. The external scheduler and its secret are deployment configuration, not a Vercel upgrade.

## Global engineering rules

- Inspect the current implementation before editing; do not assume the older plan is current.
- Preserve British English, calm language, no guilt, urgency, productivity scoring, or medical claims.
- Every write API must verify the authenticated user owns the target object.
- Every Stripe webhook side effect must be idempotent.
- Never delete local account data while an active Stripe billing relationship may remain.
- Do not log audio, transcript content, loop titles, email addresses, or health-related free text.
- Analytics must use pseudonymous IDs and remain disabled until consent where consent is required.
- All migrations must be additive, reversible where practical, and safe against existing production data.
- Do not edit or commit generated `public/sw.js` unless the build intentionally regenerates it as part of the final release.
- After every phase run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
- Commit each phase independently so it can be reviewed or rolled back.

---

# Phase 1: Repair acquisition and checkout

Goal: a signed-out visitor can choose a plan, create an account, pay, and reach onboarding without losing the selected plan or being bounced back to the paywall.

## 1.1 Preserve plan choice through authentication

Likely files:

- `components/marketing/PricingTable.tsx`
- `app/(auth)/sign-up/[[...sign-up]]/page.tsx` or the current Clerk sign-up route
- `app/(app)/subscribe/page.tsx`
- `components/app/SubscriptionGate.tsx`
- `middleware.ts`

Implementation:

1. Pricing buttons must not call the protected checkout API while signed out.
2. Send signed-out users to `/sign-up?plan=monthly` or `/sign-up?plan=annual`.
3. Preserve only an allow-listed plan value through Clerk redirect. Reject arbitrary price IDs supplied by the browser.
4. After authentication, redirect to `/subscribe?plan=...` and start checkout only after an explicit user click.
5. Keep `/api/stripe/checkout` authenticated. Return JSON `401`/`403` errors rather than an HTML not-found response if it is called without access.
6. Hide the lifetime plan and remove it from the public founding counter during the beta. Do not delete its Stripe configuration.

Acceptance:

- A signed-out annual-plan click reaches sign-up and then an annual checkout.
- Refreshing or returning from Clerk does not silently change annual to monthly.
- A malformed plan query cannot select an arbitrary Stripe price.
- A signed-in user can still change plan on `/subscribe` before opening checkout.
- Pricing failures show a calm, actionable inline message.

## 1.2 Make checkout completion resilient

Likely files:

- `app/api/stripe/checkout/route.ts`
- `app/api/stripe/checkout-status/route.ts` (new)
- `components/app/SubscriptionGate.tsx`
- onboarding success UI

Implementation:

1. Include `{CHECKOUT_SESSION_ID}` in Stripe's success URL.
2. Add an authenticated checkout-status endpoint that retrieves the session from Stripe and verifies its Clerk/user metadata matches the caller.
3. On the success page, poll status briefly while the webhook completes. Show a contained "Setting up your space" state rather than redirecting back to subscribe.
4. If payment succeeded but the webhook is delayed, reconcile the subscription from Stripe using the same shared service used by the webhook.
5. Make reconciliation idempotent and server-only.
6. Record `checkout_started`, `checkout_completed`, and `checkout_failed` through the analytics abstraction added in Phase 4; calls can initially no-op.

Acceptance:

- A successful Stripe test checkout cannot be bounced to `/subscribe` because of webhook latency.
- A checkout session belonging to another user returns 404 or 403 without revealing its details.
- Repeated status polling does not duplicate user, trial, or subscription records.

Tests:

- Plan allow-list unit tests.
- Signed-out pricing-button browser test.
- Checkout-session ownership test.
- Webhook-delay reconciliation test with Stripe SDK mocked.

---

# Phase 2: Harden billing and account lifecycle

Goal: retries, cancellations, failed payments, and account deletion cannot corrupt entitlement or leave somebody paying without access.

## 2.1 Idempotent Stripe event processing

Likely files:

- database schema and a new migration
- `app/api/stripe/webhook/route.ts`
- new `lib/billing/reconcile-subscription.ts`

Implementation:

1. Add a `stripe_webhook_events` table with a unique Stripe event ID, event type, received timestamp, processed timestamp, and failure summary without personal payload data.
2. Insert or claim the event before applying side effects. A duplicate event must return 200 without applying work again.
3. Put entitlement updates and event completion in one transaction where the database permits it.
4. Centralise subscription mapping for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and failed/succeeded invoice events.
5. Preserve read-only access to existing loops when entitlement lapses.
6. Add structured server logs containing event IDs and types, never customer email or content.

Acceptance:

- Replaying the same event ten times applies its effects once.
- Out-of-order subscription events reconcile against current Stripe state instead of trusting stale event order.
- `past_due`, `canceled`, `trialing`, `active`, and lifetime states map consistently in the gate and APIs.

## 2.2 Safe account deletion

Likely files:

- `app/api/me/route.ts`
- settings delete-account UI
- `lib/billing/*`

Implementation:

1. On deletion, fetch and cancel active Stripe subscriptions or delete the Stripe customer and verify success.
2. If Stripe fails, stop. Keep the Unloop account and display that deletion could not yet be completed.
3. Delete Clerk identity only after billing and application-data deletion succeed in the intended order.
4. Make repeat deletion requests safe.
5. Add a confirmation statement that deletion cancels billing and permanently removes data.
6. Record a content-free audit result for support diagnostics.

Acceptance:

- Simulated Stripe failure leaves the user account and data intact.
- Successful deletion leaves no active Stripe subscription and no accessible Unloop data.
- Repeating a completed deletion cannot recreate or partially restore anything.

## 2.3 Subscription management UX

Implementation:

1. Confirm the billing portal opens for active/trialing customers.
2. Show plan, trial end or renewal date, and a clear manage-subscription action in Settings.
3. Show payment-problem and expired states without hiding historical loops.
4. Do not implement custom cancellation forms when Stripe Billing Portal can handle the operation.

Tests:

- Webhook fixture tests for every supported event.
- Duplicate and out-of-order event tests.
- Account deletion with Stripe success and failure.
- Read-only entitlement API tests.

---

# Phase 3: Correct lifecycle scheduling and email

Goal: summaries and reminders are generated when due, exactly once, without relying on timezone-mismatched once-daily cron expressions.

## 3.1 One idempotent lifecycle sweep

Likely files:

- `app/api/cron/lifecycle/route.ts` (new)
- existing check-in and weekly-summary cron routes
- database schema and migration
- `vercel.json`

Implementation:

1. Extract check-in, weekly-summary, trial-reminder, and cleanup decisions into pure `isDue` functions.
2. Add one authenticated `/api/cron/lifecycle` route. Require `Authorization: Bearer <CRON_SECRET>` and use a timing-safe comparison.
3. Process bounded batches with a cursor so one invocation cannot time out on the full user table.
4. Store per-user/per-job last-attempt and last-success timestamps or a unique delivery key.
5. Use unique keys such as `weekly-summary:userId:weekStart` and `trial-reminder:userId:trialEndDate:offset` to prevent duplicates.
6. A delayed invocation should process overdue work inside a defined window; it must not require the current UTC hour to equal a local hour exactly.
7. Keep only a once-daily Vercel cron as a fallback sweep. Document that an external hourly scheduler should call the same endpoint for timely delivery.
8. Retire duplicate cron logic only after the lifecycle endpoint has tests and production smoke verification.

Acceptance:

- London and New York users receive the correct weekly summary once per local week.
- Running the endpoint repeatedly produces no duplicate summaries, pushes, or emails.
- A scheduler delayed by two hours still processes due work once.
- One failing user/job does not abort the entire batch.

## 3.2 Configure email as a real product dependency

Likely files:

- `lib/email/trial-reminder.ts`
- `lib/email/weekly.ts`
- email templates and deployment documentation

Implementation:

1. Make missing `RESEND_API_KEY` an explicit health warning in production, not a silent success.
2. Add branded plain HTML/text emails for trial reminders and optional weekly summaries.
3. Include the renewal amount/date in pre-conversion trial reminders and a direct manage/cancel route.
4. Respect notification preferences and record delivery attempts without storing message bodies.
5. Add unsubscribe handling for optional reflective emails. Transactional billing notices remain separate.
6. Add `docs/PAID_BETA_DEPLOYMENT.md` listing Resend domain verification and required environment names, never secret values.

Tests:

- Due-time tests across DST boundaries and multiple timezones.
- Duplicate delivery tests.
- Resend absent, success, and failure tests.
- Batch continuation after one user fails.

---

# Phase 4: Add consented measurement and owner visibility

Goal: know whether users reach value, return, convert, fail, or cost too much without collecting their private content.

## 4.1 Consent-aware analytics

Likely files:

- `lib/analytics.ts`
- analytics provider components
- marketing cookie/privacy control
- `components/providers/PostHogUserIdentify.tsx`

Implementation:

1. Analytics must remain disabled until configured and, where required, consented.
2. Add a small privacy control with `Accept analytics` and `Decline`; declining must be equally easy.
3. Do not send email, transcript, loop title, next step, notes, category text, or recording metadata that could expose content.
4. Identify with the internal pseudonymous user ID only.
5. Disable session recording and broad autocapture. Track an explicit event allow-list.
6. Support consent withdrawal and analytics reset from Settings.

Required events:

- `signup_started`
- `signup_completed`
- `checkout_started`
- `checkout_completed`
- `trial_started`
- `offload_started` with mode only
- `offload_completed` with duration bucket and new/matched counts
- `first_loop_action`
- `loop_state_changed` with from/to state only
- `session_outcome_recorded` with outcome enum only
- `weekly_summary_viewed`
- `subscription_converted`
- `subscription_canceled`
- `offload_failed` with controlled error code

## 4.2 Minimal owner dashboard

Implementation options: an authenticated admin-only route in the app, or privacy-safe PostHog dashboards. Prefer PostHog first unless operational failures require an in-app view.

Show:

- signup to first-offload conversion
- first offload to first loop action
- D1 and D7 return for activated users
- checkout completion and trial conversion
- cancellation and refund counts
- offload failure rate by controlled error code
- AI calls, audio minutes, and estimated cost per activated user
- lifecycle job and email failure counts

AI cost correction:

- Replace fixed transcription cost estimates with duration-based estimates.
- Keep model pricing in server configuration with a recorded pricing-version date.
- Do not expose private prompts or content in the dashboard.

Acceptance:

- A declined-consent browser sends no PostHog requests.
- No event payload contains user-entered content or email.
- The complete activation funnel can be calculated.
- Transcription cost increases with audio duration.

---

# Phase 5: Privacy, safety, and promise alignment

Goal: product behaviour, marketing claims, and privacy documentation say the same thing.

## 5.1 Offline audio queue

Likely files:

- `lib/offload/queue.ts`
- capture/offline UI
- privacy and FAQ pages

Implementation:

1. Add `createdAt`, `expiresAt`, attempt count, and visible queue status to queued offloads.
2. Delete queued audio after successful processing, explicit discard, sign-out, account deletion, or a maximum 24-hour TTL.
3. Purge expired entries on application start and before queue processing.
4. Give the user a visible `Discard recording` action while an item is queued.
5. Never place queued audio in localStorage, logs, analytics, or service-worker caches.
6. Update copy to state accurately: audio is not retained on Unloop servers after transcription; when offline, it may be held temporarily on the user's device until sent or discarded.

Acceptance:

- A successful offload leaves no audio in IndexedDB.
- Expired, signed-out, and discarded recordings are removed.
- Marketing no longer makes an absolute claim contradicted by offline behaviour.

## 5.2 Privacy notice and data controls

Implementation:

1. Expand the privacy notice with controller/contact identity, data categories, purposes, lawful bases, special-category handling, processors, international transfers, retention periods, rights, ICO complaint route, and automated-processing explanation.
2. Document the operational Article 6 basis and Article 9 condition selected for sensitive free text. Obtain legal review rather than inventing this in code.
3. List Clerk, Stripe, AI providers, database hosting, email, analytics, and error monitoring as applicable processors/subprocessors.
4. Confirm export includes loop history, session metadata, and account data in a portable format without secrets.
5. Ensure deletion clears queued local audio and analytics identity in addition to server data.
6. Add a version/effective date to legal documents.

## 5.3 Claims and positioning

Likely files:

- `components/marketing/Hero.tsx`
- FAQ/science copy

Implementation:

1. Replace "can quiet a loop almost as well as completing it" with a narrower claim: unfinished goals can keep attention active, and making a specific plan may reduce that interference.
2. Do not claim to treat ADHD, anxiety, insomnia, or another condition.
3. Keep crisis support and the existing non-clinical boundary visible but not alarmist.
4. Add source links for the plan-making evidence on the science/privacy information surface rather than crowding the hero.

Acceptance:

- Every audio, AI, and science claim is literally true of production behaviour.
- Export and deletion pass an end-to-end test.
- No marketing page implies clinical treatment or guaranteed relief.

---

# Phase 6: Improve activation without feature bloat

Goal: let users experience Unloop's core value before asking for payment and make the session ending truthful.

## 6.1 One complete free offload

Implementation:

1. Give each new account one server-enforced free completed offload without a card.
2. Include transcription, extraction, the mental field, loop detail, and one state change so the experience is real.
3. Count completion server-side in the same transaction as the successful extraction/session write. Failed attempts do not consume it.
4. After the first meaningful loop action, present the subscription choice as the way to keep using Unloop.
5. Do not allow repeated accounts or client-state clearing to bypass the entitlement trivially; rate limits and Clerk identity are sufficient for beta, without invasive fingerprinting.
6. Existing paid users and incomplete legacy onboarding must continue to work.

Acceptance:

- A new user can experience one successful end-to-end session before checkout.
- A failed transcription does not consume the free session.
- A second offload requires valid access.
- The user's first loops remain readable if they do not subscribe.

## 6.2 Truthful session review

Likely files:

- `components/sheet/SessionSummary.tsx`
- offload result/session data model

Implementation:

1. Remove hard-coded before/after loop clusters.
2. Render actual session results: new loops, matched loops, proposed changes, and the user's confirmed actions.
3. Use simple text and small real loop marks. Do not manufacture a visual reduction that did not occur.
4. Let the user correct extraction before finalising where the existing review flow supports it.
5. End with one optional outcome question: `Does your head feel quieter?` Answers: `Yes`, `Somewhat`, `Not yet`, `Skip`.
6. Store only the outcome enum, session ID, and timestamp. Do not infer a mental-health score.

Acceptance:

- Every displayed item came from the current session.
- Skipping the outcome never blocks progress.
- Outcome responses are measurable without exposing content.

---

# Phase 7: CI, observability, and release gates

Goal: prevent a checkout, deployment, scheduler, or ownership regression from reaching paying users unnoticed.

## 7.1 Continuous integration

Add a GitHub Actions workflow for pull requests and `master`:

1. Install with the lockfile.
2. Run tests.
3. Run lint.
4. Run TypeScript checking.
5. Run a production build with documented non-secret test configuration.
6. Cache dependencies without caching secrets or generated environment files.

## 7.2 Required automated coverage

- Stripe webhook signature rejection.
- Duplicate and out-of-order webhook events.
- Checkout session ownership and plan allow-list.
- Subscription gate for every entitlement state.
- Account deletion with Stripe failure.
- Cron authentication, due-time, DST, batching, and dedupe.
- API ownership checks for loops, events, summaries, and export.
- Offline queue expiry and deletion.
- One-free-offload entitlement.
- Browser flow: landing -> plan -> signup handoff -> subscribe.
- Browser flow with mocked billing: first offload -> real session review -> first state action -> paywall.

## 7.3 Production health

Implementation:

1. Add a protected/admin health endpoint that reports configuration presence and job freshness, never secret values.
2. Include Stripe, AI mode, email, database, analytics, scheduler freshness, and last successful lifecycle run.
3. Assert that mock AI mode is disabled for production. Fail closed or show a deployment health failure; never silently sell a mock experience.
4. Add privacy-safe error monitoring or structured error capture for checkout, offload, webhook, lifecycle, and email paths.
5. Create a release checklist in `docs/PAID_BETA_DEPLOYMENT.md`.

Acceptance:

- CI blocks merge on test, type, lint, or build failure.
- A deployment with mock AI or missing Stripe configuration is visibly unhealthy.
- The owner can detect failed offloads, webhooks, and stale scheduler runs without reading user content.

---

# Paid beta release checklist

All items are required unless explicitly marked optional:

- Signed-out plan selection and authenticated checkout pass in production.
- Stripe test-mode fixtures and one controlled live low-value transaction pass.
- Checkout success survives delayed webhook processing.
- Account deletion cancels billing before deleting data.
- Webhook replay produces no duplicate side effects.
- One free full offload works and cannot be consumed by a failed attempt.
- Resend sending domain and trial reminders are live.
- External scheduler invokes lifecycle sweep and freshness is visible.
- Analytics consent works; decline sends no analytics traffic.
- Privacy notice and offline audio wording match production.
- Custom support email is monitored.
- Production uses real AI, not mock mode.
- CI and production build pass from a clean checkout.
- Hosting arrangement permits commercial use before the first payment is accepted.

## Beta success measures

Treat these as directional launch thresholds, not universal industry standards:

- At least 70% of completed sign-ups reach a first successful offload.
- At least 60% of first offloads lead to a loop state action.
- At least 35% of activated users return within seven days.
- Fewer than 5% of offload attempts fail for product-controlled reasons.
- At least 70% answer `Yes` or `Somewhat` to the optional quieter-head question.
- More than 50% of users who intentionally open checkout complete it.
- Refund, accidental-renewal, privacy, and incorrect-extraction complaints are reviewed individually during beta.

## Composer execution order

Use one Composer task and one commit per numbered phase:

1. Phase 1: acquisition and checkout.
2. Phase 2: billing lifecycle.
3. Phase 3: scheduler and email.
4. Phase 4: analytics and owner visibility.
5. Phase 5: privacy and claims.
6. Phase 6: activation and session review.
7. Phase 7: CI and production health.

At the beginning of each task, ask Composer to read this document, inspect the named files and current schema, and produce a short change list before editing. At the end, require the relevant acceptance tests plus the global verification commands. Do not let a later phase paper over a failing earlier phase.
