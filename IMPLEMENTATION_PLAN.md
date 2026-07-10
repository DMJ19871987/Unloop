# Unloop — Implementation Plan (from spec audit, July 2026)

This plan closes every gap found in the audit of the codebase against `unloop_build_spec.md`. Work through phases in order: **P0 → P1 → P2**. Each task lists the files to touch, the exact behaviour required, and acceptance criteria.

## Global constraints (apply to every task)

- **Copy rules (spec §12):** calm, plain, British English. No exclamation marks anywhere in-app. No streak/guilt/productivity language. Serif (`--font-heading`) for emotional lines, sans (`--font-ui`) for functional UI. Full stops.
- **No task-manager tropes:** no checkboxes-as-completion, due dates, priorities, progress bars, badges.
- **Platform hygiene (spec §3.3):** new `window`/`navigator`/`localStorage` access goes through `lib/platform.ts` or behind mounted-client guards.
- **DB rule (spec §7):** every loop state change writes a `loop_events` row **in the same transaction** as the `loops` update. Every AI call writes to `ai_usage_log`.
- **After each phase:** run `npm test` and `npm run build`; both must pass.

---

# PHASE 0 — Business-critical (do first)

## P0.1 Subscription gating (the paywall)

**Problem:** Nothing checks `users.subscriptionStatus`. Users are created as `"trialing"` by `getOrCreateUser()` (`lib/auth/user.ts`) without ever touching Stripe. The paid-only model is unenforced.

**Changes:**

1. **New helper `lib/auth/subscription.ts`:**
   - `getSubscriptionAccess(user): "full" | "read_only" | "blocked"`.
   - `full`: status `active`, `lifetime`, or `trialing` **with `trialEndsAt` in the future**.
   - `read_only`: `past_due` within a 7-day grace window (compare against the subscription's `updatedAt` or store a `pastDueSince` timestamp — add column if needed via a new migration `0004`), or `trialing` with `trialEndsAt` past.
   - `blocked`: `canceled`, or grace window expired.
2. **Fix trial creation:** `getOrCreateUser()` must set `trialEndsAt = now + 7 days` when creating a user (currently null). Long-term source of truth is the Stripe webhook, but this prevents the "free forever" default.
3. **Force checkout after sign-up:** in the authenticated app layout or `app/(app)/field/page.tsx` bootstrap, if the user has no `stripeCustomerId` and status is `trialing` without a Stripe subscription, redirect to a new `/subscribe` page that immediately presents the annual-first plan choice and creates a Checkout session (`app/api/stripe/checkout/route.ts` already exists). Change checkout `success_url` from `/field?checkout=success` to `/onboarding?checkout=success`.
4. **Enforce on write APIs:** in `/api/transcribe`, `/api/extract`, `/api/loops` (POST/PATCH/DELETE), `/api/loops/[id]/*`, `/api/record` (reopen): if access is `read_only` or `blocked`, return 403 with friendly copy: `"Your subscription has lapsed. Your loops are safe — renew to keep offloading."` Read APIs (`GET /api/loops`, `/api/record`, `/api/me/export`) stay available in `read_only` (never hold data hostage; spec §10).
5. **In-app banner:** new `components/app/SubscriptionBanner.tsx` rendered in `app/(app)/layout.tsx` when access ≠ `full`. `past_due`: "There's a problem with your payment. Update your card to keep offloading." with a button to the Stripe billing portal (`/api/stripe/portal`). Trial-expired/blocked: link to `/subscribe`. Capture screen disables the record button in read-only with quiet copy.
6. **Checkout hardening:** add `payment_method_collection: "always"` and `automatic_tax: { enabled: true }` to the Checkout session in `app/api/stripe/checkout/route.ts` (Stripe Tax, GB).

**Accept:** a fresh Clerk user cannot reach capture without going through Checkout; a user with `subscriptionStatus = "canceled"` sees the field read-only with a banner and gets 403s on write APIs; an `active` user is unaffected.

## P0.2 Cron timezone fan-out

**Problem:** `vercel.json` fires `weekly-summary` once (Sun 09:00 UTC) and `checkin` once (20:00 UTC), but both routes filter users by *local* hour — most timezones never match.

**Changes:**

1. `vercel.json`: change `checkin` schedule to hourly (`"0 * * * *"`) and `weekly-summary` to hourly on Sundays (`"0 * * * 0"`). Note: users west of UTC may have their local Sunday-18:00 fall on Monday UTC — the weekly-summary route should therefore also run early Monday (`"0 0-12 * * 1"` as a second cron entry) or, simpler, run hourly every day (`"0 * * * *"`) and let the route's own `isUserDueForWeeklySummary(tz, 18, 0)` + "already generated this week" check (dedupe on `weekly_summaries.weekStart`) decide.
2. `app/api/cron/checkin/route.ts`: keep the per-user local-hour match against `checkinHour`; **add dedupe** — record last-sent date (new `users.lastCheckinSentAt` column, migration `0004`) and skip if already sent today in the user's timezone. This also enforces the spec's max-one-notification-per-day rule.
3. `app/api/cron/weekly-summary/route.ts`: before generating, skip users who already have a `weekly_summaries` row for the current `weekStart`.

**Accept:** with a user in `America/New_York` (`checkinHour = 20`), exactly one check-in push fires at 20:00 local; a Europe/London user gets exactly one weekly summary per week, generated near Sunday 18:00 local.

## P0.3 Fix crisis-purge cron auth

**Problem:** `middleware.ts` lists other cron routes as public but **not** `/api/cron/purge-crisis-transcripts` — Clerk's `auth.protect()` 401s Vercel cron before `CRON_SECRET` is checked.

**Change:** add `/api/cron/purge-crisis-transcripts` to the public-route matcher in `middleware.ts` (same pattern as the other crons — or replace individual entries with `/api/cron(.*)`; every cron route already validates `CRON_SECRET` itself).

**Accept:** `curl -H "Authorization: Bearer $CRON_SECRET" /api/cron/purge-crisis-transcripts` returns 200 without a Clerk session.

## P0.4 PostHog integration (spec §13)

**Problem:** `posthog-js` is installed but there is zero application code. All 16 events and every funnel are missing.

**Changes:**

1. **Client init:** new `components/providers/PostHogProvider.tsx` (client component) initialising `posthog-js` with `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` (EU). Per spec §11: `autocapture: false`, `disable_session_recording: true`, `capture_pageview: false` on app screens (manual pageviews on marketing pages are fine). Identify with Clerk user id after sign-in. Mount in `app/layout.tsx`. No-op cleanly when the key is absent (dev).
2. **Analytics helper:** `lib/analytics.ts` exporting `track(event, properties?)` (client) so calls are one-liners and typed. Server-side events use `posthog-node` (add dependency) via `lib/analytics-server.ts` — needed for webhook/cron events.
3. **Wire all spec events:**
   - `signup_started` — marketing CTA click (`Hero.tsx`, `PricingTable.tsx`).
   - `trial_started(plan)` — server, Stripe webhook `checkout.session.completed`.
   - `offload_started(mode)` / `offload_completed(loops_new, loops_matched, duration)` — `components/capture/CaptureScreen.tsx`.
   - `loop_state_changed(from, to, category, weight)` — `components/sheet/LoopDetailSheet.tsx` after successful transition (client) — include merge/delete as their own properties or events if trivial.
   - `field_toggle_used(view)` — `components/field/FieldToggle.tsx`.
   - `record_viewed` — `app/(app)/record/page.tsx`.
   - `weekly_summary_viewed` — Record view when summary cards render.
   - `parked_resurfaced(count)` — resurface banner shown (`ResurfaceBanner` / field page).
   - `notification_optin(type)` — `CheckinOnboarding.tsx` and settings toggles.
   - `notification_quieter_tapped` — quieter handler (settings + SW click-through, P1.7).
   - `pwa_installed` — `appinstalled` event listener (add to `InstallPrompt.tsx` / `lib/platform.ts`).
   - `subscription_converted(plan)` / `subscription_canceled(reason?)` — server, Stripe webhook.
   - `data_exported` — export handler in settings.
   - `account_deleted` — server, in `DELETE /api/me`.
   - Waitlist signup event in `app/api/waitlist/route.ts` (prelaunch mode).
4. **GDPR:** in `DELETE /api/me` (`app/api/me/route.ts`), after Clerk/Stripe deletion, call PostHog person deletion (`$delete_person` via posthog-node or the PostHog API).

**Accept:** with a key configured, the funnel landing → signup → trial → first offload → first loop closed emits in order in PostHog EU; with no key, the app runs without errors; deleting an account removes the PostHog person.

---

# PHASE 1 — Product promise (signature moments, onboarding, offline)

## P1.1 Onboarding: 3-swipe flow + routing

**Problem:** `app/(app)/onboarding/page.tsx` is one static screen and nothing ever routes new users to it.

**Changes:**

1. Rebuild the page as a 3-panel swipe/advance flow (Framer Motion, swipe + tap-to-advance + dots): (1) "Your head isn't storage." (2) "Speak freely. We'll find the loops." (3) "Close them, contain them, or set them down." Final action → `/offload`. No data capture. Respect `prefers-reduced-motion` (crossfade instead of slide).
2. Routing: the schema already has `users.onboardingComplete`. After checkout success (P0.1 sends users to `/onboarding?checkout=success`), and on any app-shell load where `onboardingComplete` is false, redirect to `/onboarding`. Set the flag via `PATCH /api/me` when the user finishes the third panel.

**Accept:** a brand-new paid user lands on the 3 panels exactly once, ends at capture, and never sees them again.

## P1.2 Zero-loop "clear head" outcome

**Problem:** extraction returning zero loops redirects to `/field?clear=1`, which the field strips without showing anything.

**Change:** in `app/(app)/field/page.tsx`, when `clear=1` is present show a dismissible interstitial (reuse `SessionSummary` styling): serif line **"Sounds like a clear head. Nothing to hold."** Auto-dismiss after 6s or on tap. Log the session normally (already done server-side).

**Accept:** speaking "today was actually fine" (MOCK_AI has a fixture path for this — check `lib/ai/mock-extract.ts`) lands on the field with the clear-head card, then the normal field.

## P1.3 Distinct close animations: done vs released

**Problem:** `done` and `released` share one close path. Spec: done closes in **accent** terracotta; released closes with the stroke **fading to `--closed` grey** as the arc completes.

**Changes:** in `components/field/LoopCircle.tsx` (and the `isClosing`/`animateArc` plumbing in `LoopField.tsx` + `LoopDetailSheet.tsx`), thread the closing state (`done` vs `released`) through to the circle. Done: arc sweeps to 1.0 over 900ms ease-out keeping accent stroke, then 3s fade. Released: same sweep but animate stroke colour to `var(--closed)` during the sweep. Keep the single haptic tick for both.

**Accept:** side by side, closing one loop as done and another as released are visually distinct; both run at 60fps (transform/opacity/stroke only, no layout thrash).

## P1.4 Parked horizon chips

**Problem:** "Revisit later" parks immediately with a silent +21-day default. Spec wants optional one-tap horizon chips.

**Changes:** in `components/sheet/LoopDetailSheet.tsx` + `components/sheet/ClosureOptions.tsx` (the unused `showHorizon` prop exists): tapping "Revisit later" reveals an inline row of three chips — `next week · next month · someday` — plus the loop parks on chip tap. "next week" = +7d, "next month" = +30d, "someday" = null (server default +21d in `lib/loops/transitions.ts` already handles null). Chips are optional per spec: also allow parking without choosing (e.g. a quiet "just park it" affordance or parking on the main pill with chips as refinement — pick the simpler UX: first tap shows chips + a "just set it down" option). Send `resurfaceAfter` in the PATCH body (API already accepts it).

**Accept:** parking via "next week" sets `resurface_after` ≈ 7 days out in the DB; parking without a chip leaves the server default; confirm message "Parked for later." still shows.

## P1.5 "Still on my mind" microcopy

**Change:** in `LoopDetailSheet.tsx`, after a successful `still_on_mind` action, show in-sheet (same pattern as `finishWithConfirm`, ~1.5s): **"Okay. It can stay here where you can see it."** then dismiss. No advice, no follow-up.

**Accept:** tapping "Still on my mind" shows the line, sheet closes, circle is slightly larger on return (weight+1 already works).

## P1.6 Recording auto-stop + 4:30 warning + processing polish

**Problem:** `PwaAudioRecorder` in `lib/platform.ts` has `maxTimeout` (300s) and a warning timer (270s) but `createAudioRecorder()` never wires callbacks, so nothing happens in the UI. Also the waveform just vanishes on stop (spec: gathers inward into a dot), and the server never rejects long audio.

**Changes:**

1. `lib/platform.ts`: extend `createAudioRecorder(maxMs, { onWarning, onMaxReached })` and invoke them from the existing timers.
2. `components/capture/CaptureScreen.tsx`: wire `onWarning` → status text "30 seconds left." (quiet, not alarming); `onMaxReached` → stop recording and run the normal processing pipeline exactly as a manual stop.
3. Processing transition: animate the waveform bars gathering to a single centred dot (Framer Motion — animate each bar's `x` toward centre and `height` to dot size over ~600ms) before the "Finding your loops…" state.
4. `app/api/transcribe/route.ts`: reject `durationSeconds > 330` (5.5 min) alongside the existing 8MB check, with friendly copy.

**Accept:** a recording left running warns at 4:30 and auto-stops + processes at 5:00; stopping shows the gather animation; an artificially long upload is rejected server-side.

## P1.7 Push notifications: SW handlers, 1/day cap, quieter, frequency

**Problem:** `app/sw.ts` is precache-only — no `push`/`notificationclick` listeners, so pushes don't display and the "quieter please" action can't work. `notificationFrequency` is ignored in `lib/push/send.ts`. No daily cap (partially fixed by P0.2 dedupe).

**Changes:**

1. `app/sw.ts`: add `push` listener (parse payload from `lib/push/send.ts`, `showNotification` with title/body/actions including `{ action: "quieter", title: "Quieter please" }`) and `notificationclick` listener: default click → focus/open `/offload`; `quieter` action → `fetch("/api/push/subscribe", { method: "PATCH" })` (endpoint already halves `notificationFrequency`), then track `notification_quieter_tapped`.
2. `lib/push/send.ts`: respect `notificationFrequency` — probabilistic send (`Math.random() < frequency`) or every-Nth-day skip; document the choice.
3. Confirm payload shape matches between `send.ts` and the SW listener.

**Accept:** a real web push displays on Android Chrome with a working "Quieter please" action that halves the stored frequency; users never receive more than one push per day (P0.2 dedupe + this).

## P1.8 Field offline mode

**Problem:** the field always fetches `/api/loops`; offline it renders nothing. `?offline=1` from capture is ignored.

**Changes:**

1. `app/(app)/field/page.tsx`: on every successful `/api/loops` fetch, cache the response via `platform.storeLocal("loops-cache", …)` (idb-keyval). On fetch failure or `navigator.onLine === false` (via a `platform.isOnline()` helper), render from cache with a quiet indicator (small `--ink-soft` text near the header): "Offline — showing your last field." Handle `?offline=1` (post-capture offline redirect) with the queue message: "Held safely — it'll process when you're back online."
2. Listen for `online` and refetch + drop the indicator.

**Accept:** with DevTools offline, the field renders the last-known loops with the indicator; going online refreshes silently.

## P1.9 Service worker: NetworkOnly for `/api/*`

**Change:** in `app/sw.ts`, register an explicit runtime rule so all `/api/` requests are `NetworkOnly` (Serwist: prepend to `runtimeCaching` a matcher on `url.pathname.startsWith("/api/")`). Keep `defaultCache` for the rest.

**Accept:** with the SW active, API responses are never served from cache (verify via DevTools network panel — no "(ServiceWorker)" cached responses on `/api/*`).

## P1.10 New-loop settle animation from centre

**Change:** in `components/field/LoopField.tsx`, new loops (post-offload ids) start at field centre with small scale and animate to their layout coordinates (position + scale spring, staggered ~80ms apart), instead of fading in at final positions. Also fix the fragile `newLoopIds` heuristic in `app/(app)/field/page.tsx`: the extract API response already returns created ids — pass them through the redirect (e.g. `?new=id1,id2`) rather than inferring from `updatedAt` ordering.

**Accept:** after an offload, new loops visibly drift from centre outward to their settled spots; matched (grown) loops don't replay the entry animation.

---

# PHASE 2 — Polish, trust, hardening

## P2.1 Brand fonts

**Change:** swap Spectral → **Fraunces** and Hanken Grotesk → **Inter** via `next/font/google` in `app/layout.tsx`; update `--font-heading`/`--font-ui` in `app/globals.css`. Check the marketing pages and field for any size/weight regressions (Fraunces runs wider — spot-check the hero H1 and loop labels).

## P2.2 Legal & meta

1. **Terms page:** new `app/(marketing)/terms/page.tsx` — plain-English terms (service description, subscription/trial/cancellation per §10, acceptable use, "not therapy or a health service" per §12, liability, UK law). Match the privacy page's layout. Link from the footer in `Hero.tsx`.
2. **Privacy policy:** add a crisis-transcript section to `app/(marketing)/privacy/page.tsx`: transcripts flagged for safety are retained up to `CRISIS_TRANSCRIPT_RETENTION_DAYS` (30 days) then permanently deleted, why (safety), and that this is special-category data handled under UK GDPR. Also replace the `CRISIS_ACK_COPY` placeholder in `lib/safety/crisis-resources.ts` (TODO at L12) with final copy — keep the spec §8.4 register.
3. **OG image:** add `app/opengraph-image.tsx` (Next.js ImageResponse) rendering the hero field frame — paper background, 4–5 hand-drawn-style arcs, "Unloop — Empty your head." serif.
4. **Footer:** add terms + social links (placeholders acceptable: TikTok, Instagram).

## P2.3 Payments completeness

1. **Trial reminder (day 5):** new `app/api/cron/trial-reminder/route.ts` + `vercel.json` daily entry + middleware public route. Find users with `subscriptionStatus = "trialing"` and `trialEndsAt` 2 days out; send via Resend (new `lib/email/trial-reminder.ts`, matching `lib/email/weekly.ts` style): "Your trial ends in 2 days." Calm copy, manage-subscription link. Dedupe with a `trialReminderSentAt` column (migration `0004`).
2. **Founding counter on load:** new `GET /api/founding-slots` returning remaining lifetime slots from `founding_member_counter`; `components/marketing/PricingTable.tsx` fetches on mount and shows "N of 200 remaining". Replace the `alert()` error with an inline message.

## P2.4 Remaining capture/sheet polish

1. **Next-step mic:** make the mic icon in `components/sheet/NextStepInput.tsx` functional — reuse `platform.createAudioRecorder()` (30s cap), POST to `/api/transcribe`, drop the text into the input for confirmation before save. Log usage with operation `next_step_stt` (type already exists in `lib/ai/log.ts`).
2. **Parked cluster:** label the collapsed indicator "{n} parked" when the collapsed set is all-parked (else "{n} more"); make it re-collapsible (toggle, not one-way); prefer collapsing parked loops first (adjust priority in `lib/loops/layout.ts`). Bump chip to `min-h-[48px]`.
3. **Transcribe retry:** explicit "Try again" button on transcription failure in `CaptureScreen.tsx` (audio is already queued — trigger `processQueue()` manually); surface a quiet message if queue processing fails instead of silent `null` (`lib/offload/queue.ts` L109).
4. **Empty-state circle:** render the field empty-state circle with the hand-drawn `LoopCircle`/arc-path (arc=1.0, `--closed`), not CSS `rounded-full` (`LoopField.tsx` L112).
5. **Install prompt persistence:** persist dismissal (`platform.storeLocal("install-prompt-dismissed", true)`) so it doesn't re-show every session; still never show before first completed session.

## P2.5 Settings completeness

1. **Check-in time picker:** replace the fixed 8pm checkbox with an hour select (18:00–22:00 range is enough) writing `checkinHour`; keep "off" as an option (null).
2. **Transcript toggle framing:** relabel to "Don't keep my transcripts" (inverted boolean handling in `SettingsScreen.tsx`; API field `keepTranscripts` unchanged).
3. **Account link:** add a "Manage account" row opening the Clerk user profile.
4. **Tap targets:** `FieldToggle.tsx` and `RecordView.tsx` toggle to `min-h-[48px]`.

## P2.6 Backend hardening

1. **Combined rate limit:** count transcribe + extract against one daily "offload" budget in `lib/rate-limit.ts` (20 soft / 40 hard per spec §15) — key on operation group, not individual op.
2. **Extract transaction:** wrap session insert + matched-loop updates + new-loop inserts in one `db.transaction` in `app/api/extract/route.ts` / `lib/ai/apply-changes.ts`.
3. **Merge audit trail:** `applyMerge()` (`lib/ai/apply-changes.ts`) and `app/api/loops/[id]/merge/route.ts` must write `loop_events` (e.g. `toState` unchanged, note `"merged into <targetId>"`) inside the transaction.
4. **Extraction lock:** replace the in-memory `extractionLocks` Map with a Postgres advisory lock (`pg_advisory_xact_lock(hashtext(userId))`) inside the extract transaction — works across serverless instances.
5. **12-loop session cap:** currently `slice(0, 12)` drops extras; per spec §15 merge smallest-weight loops beyond 12 instead (combine labels or keep highest-weight 12 and fold the rest into the nearest category loop — simplest compliant option: keep 12 highest-weight, log the drop).
6. **Migration safety:** add `"vercel-build": "drizzle-kit migrate && next build"` (or a `postbuild` migrate step) to `package.json` so production can't drift again (the `crisis` column incident). Commit the `drizzle/meta` journal.
7. **Duration estimate:** `durationSeconds` in transcribe is `buffer.length / 16000` — acceptable, but clamp to sane bounds and note it feeds the 5.5-min rejection (P1.6.4).

## P2.7 Cleanup

1. **Remove dev chrome from production:** in `app/(app)/layout.tsx`, hide the header nav + `DummyDataToggle` behind `process.env.NODE_ENV === "development"` (or a `NEXT_PUBLIC_DEV_TOOLS` flag). The production app shell should be the calm field with its own navigation (field toggle + breathing capture button are the navigation).
2. **Dead code:** remove or wire `arcStrokeLayers` (`lib/loops/arc-path.ts`); fix `ReleasePassBanner.tsx` link (`/field?view=released` → `/record`); remove the unused `showHorizon` prop once P1.4 lands.
3. **Token drift:** align `--ink` to `#2B2724` and `--accent` to `#C4633E` in `app/globals.css`; replace hardcoded hexes (`#8A7E70`, `#5C5248`) with tokens.
4. **Safe areas:** define a `safe-area-bottom` utility (the class is used in `LoopDetailSheet.tsx` but never defined) — `padding-bottom: env(safe-area-inset-bottom)` — and add safe-area padding to the app shell header.
5. **Blur/shadow audit:** remove `backdrop-blur-sm` from `ProposalCards.tsx` (solid paper surface instead), per the no-glassmorphism rule.
6. **HeroFieldDemo cycle:** tighten from ~17s toward ~12s (compress the transcript-streaming phase).

---

# Verification checklist (run after all phases)

1. `npm test` and `npm run build` pass.
2. **Paywall:** new user → forced checkout → onboarding (3 swipes) → capture. Canceled user → read-only + banner.
3. **Full loop:** record a ramble (MOCK_AI on) → loops settle from centre → close one as done (accent sweep) and one as released (grey sweep) → park one via "next week" chip → "still on my mind" shows its line → flip toggle → Record shows counter + circles.
4. **Offline:** DevTools offline → field shows cached loops + indicator; record offline → "Held safely" → back online → processes.
5. **Crons:** hit all five cron routes with `CRON_SECRET` (no Clerk session) — all 200. Checkin/weekly dedupe verified by calling twice.
6. **Push:** subscribe on Android Chrome, trigger checkin cron at matching hour, notification displays, "Quieter please" halves `notificationFrequency`.
7. **PostHog:** events fire for the core funnel; account deletion removes the person.
8. **Migrations:** `drizzle-kit migrate` runs in the build; migration `0004` (new columns: `pastDueSince`?, `lastCheckinSentAt`, `trialReminderSentAt`) applied.
9. **Copy sweep:** grep user-facing strings for `!` — zero results; spot-check British spellings.
10. Lighthouse: PWA installable; accessibility ≥ 95.
