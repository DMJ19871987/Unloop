# UNLOOP — Full Product Strategy & Build Specification
**Version 1.0 · July 2026 · For: Cursor (end-to-end build)**
**Companion file: `design_handoff_unloop` (Claude Design handoff — authoritative for all visual decisions)**

---

## 0. READ THIS FIRST — Build intent

You are building **Unloop**: a voice-first mental offload app. The user speaks freely; AI converts the ramble into "open loops" (unresolved thoughts, decisions, and tasks occupying mental space), rendered as a calm visual field of incomplete hand-drawn circles. Users do not complete tasks in the app — they achieve **mental closure** by marking each loop as done, next-step-known, parked, or released.

Unloop is explicitly **NOT**: a task manager, a to-do list, a journal, a habit tracker, or a productivity tool. Any feature, copy, or UI pattern that reads as task management (checkboxes, due dates, priorities, streaks, progress bars, kanban, badges) is a defect. This constraint overrides convenience at every decision point.

The one-line positioning that governs everything: **"A visual decompression tool for unresolved thoughts."**

Build order: PWA first (installable, mobile-first), architected so a Capacitor native wrap for iOS/Android is a packaging exercise later, not a rewrite (see §3.3).

---

## 1. Product strategy summary (context for good decisions)

- **Target user:** adults carrying invisible cognitive load. Beachhead audiences: ADHD/neurodivergent community and maternal mental-load community. Acquisition is organic TikTok/Instagram; the app's visual transformation (chaotic ramble → calm circles) IS the marketing asset, so animation quality is a commercial requirement, not polish.
- **Core psychology:** the Zeigarnik effect — unfinished tasks intrude on thoughts more than finished ones, and a *concrete next step* quiets a loop nearly as well as completing it. The product mechanic maps directly onto this: closure states, not completion.
- **The retention paradox (critical design driver):** an app that succeeds by emptying itself destroys its own subscription justification. The countermeasure is a **compounding record layer**: the Released view, cumulative release counter, and weekly "state of your head" summaries turn the empty canvas from the end of value into evidence of value. This layer is a v1 requirement, not a nice-to-have (§6.6, §6.7).
- **Business model:** paid-only. 7-day free trial → **annual-first presentation**: £34.99/year default, £4.99/month positioned as the expensive alternative. £79 lifetime "Founding Member" tier capped at 200 units. Stripe.
- **Privacy is a feature:** audio is transcribed then deleted; thoughts are never used for AI training. This appears on the landing page, in onboarding, and in settings — not buried in a policy.
- **UK-first:** GBP pricing, ASA-compliant copy (§12), GDPR data rights (§11).

---

## 2. Tech stack (fixed — do not substitute)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14+ (App Router), TypeScript strict | Single repo: marketing site + app |
| Styling | Tailwind CSS + CSS custom properties from design handoff | Tokens in §5 |
| Database | Neon (serverless Postgres) | Use pooled connection string for serverless |
| ORM | Drizzle | Schema in §7; migrations via drizzle-kit |
| Auth | Clerk | Email + Apple + Google sign-in |
| Hosting | Vercel | Edge where sensible; Node runtime for AI routes |
| Version control | GitHub | Conventional commits; CI via Vercel previews |
| AI — loop extraction & summaries | Anthropic API, model `claude-sonnet-4-6` | Prompts in §8 |
| AI — speech-to-text | OpenAI API, `whisper-1` (or current best STT endpoint) | Audio deleted post-transcription |
| Payments | Stripe (Checkout + Billing Portal + webhooks) | Products in §10 |
| PWA | `@serwist/next` (or `next-pwa` if serwist blocked) | Manifest, service worker, offline shell |
| Animation | Framer Motion + `d3-force` for the loop field | §6.3 |
| Analytics | PostHog (EU cloud) | Event schema in §13 |
| Email | Resend | Trial reminders, weekly summary email (opt-in) |

Environment variables to scaffold in `.env.example`:

```
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## 3. Architecture

### 3.1 Repo structure

```
/app
  /(marketing)          → landing page, pricing, privacy (public)
    page.tsx            → hero landing (§9)
    pricing/page.tsx
    privacy/page.tsx
  /(app)                → authenticated app shell (Clerk-protected)
    offload/page.tsx    → Capture screen
    field/page.tsx      → Loop field (main screen, default post-login route)
    record/page.tsx     → Released/record view (also reachable via field toggle)
    settings/page.tsx
    onboarding/page.tsx → post-first-session preference capture only
  /api
    /transcribe         → POST audio → Whisper → transcript (audio discarded)
    /extract            → POST transcript + open loops → Claude → structured loops
    /loops              → CRUD + state transitions
    /summary/weekly     → generates weekly summary (also hit by cron)
    /stripe/webhook
    /cron/resurface     → weekly parked-loop resurfacing (Vercel cron)
    /cron/weekly-summary
/components
  /field                → LoopField, LoopCircle, FieldToggle, SummaryBar
  /capture              → RecordButton, Waveform, ProcessingState
  /sheet                → LoopDetailSheet, ClosureOptions, NextStepInput
  /marketing            → Hero, HeroFieldDemo, BenefitCards, PricingTable
/lib
  /db (drizzle schema, client)
  /ai (prompts, anthropic client, openai client, cost logging)
  /loops (state machine, weight calc, layout helpers)
/drizzle (migrations)
```

### 3.2 PWA requirements

- `manifest.json`: name "Unloop", short_name "Unloop", display `standalone`, background `#FAF7F2`, theme `#FAF7F2`, portrait orientation, maskable icons (icon = single incomplete terracotta circle on cream — generate from design handoff assets).
- Service worker: precache app shell; runtime cache fonts/static; **network-only for all `/api/*`**.
- Offline behaviour: capture screen must work offline — record audio locally (IndexedDB via `idb-keyval`), queue for upload, show "Held safely — will process when you're back online." Never lose a recording. The field renders last-known state from a local cache with a quiet "offline" indicator.
- iOS PWA quirks to handle explicitly: `viewport-fit=cover` + safe-area insets; audio recording requires user gesture; test `MediaRecorder` mime fallbacks (`audio/mp4` on iOS Safari, `audio/webm` elsewhere).
- Install prompt: after the user's **first completed session** (never before), show a gentle inline card: "Keep Unloop on your home screen" with platform-appropriate instructions.

### 3.3 Native-readiness rules (Capacitor later)

Write the app so wrapping in Capacitor is trivial:

1. **No Next.js server components inside interactive app screens' logic paths** — app screens are client components consuming JSON APIs. Server components are fine for the marketing site.
2. All device APIs (mic, storage, notifications, haptics) behind a single abstraction: `/lib/platform.ts` exposing `recordAudio()`, `vibrate()`, `notify()`, `storeLocal()`. PWA implementations now; Capacitor implementations later swap in behind the same interface.
3. No `window`/`navigator` access outside `/lib/platform.ts` and mounted-client guards.
4. All API routes are plain REST returning JSON — the native app will call the same endpoints.
5. Auth: use Clerk's standard session tokens over HTTP (works in Capacitor webviews); avoid patterns that only work with Next middleware cookies on same-origin.

---

## 4. The loop model (domain logic — the heart of the app)

A **loop** is one thing occupying mental space. Loops have:

**States** (single source of truth — implement as a state machine in `/lib/loops/state.ts`):

| State | Meaning | Visual (per design handoff) |
|---|---|---|
| `open_attention` | Live, still demanding headspace | Bold saturated stroke, larger, central, more-broken arc |
| `next_step_known` | Not done, but the next step is articulated — mentally contained | Arc noticeably fuller, calmer stroke, drifts off-centre |
| `parked` | Deliberately set aside | Small, faint, low opacity, settles at field edges |
| `released` | No longer matters / let go | Closes with animation, fades from field, persists in Record |
| `done` | Actually completed | Closes with animation, fades from field, persists in Record |

Allowed transitions: `open_attention → any`; `next_step_known → done | released | parked | open_attention`; `parked → open_attention | released | done`; `released`/`done` are terminal (but see reopen: a terminal loop can be reopened only via explicit user action in Record view, creating a `loop_events` entry).

**Attributes** (AI-assigned at extraction, user-adjustable never — the user never fills in forms about their feelings):

- `weight` (1–5): how much mental space it occupies → circle diameter.
- `emotional_intensity` (1–5): how charged it is → stroke saturation.
- `arc_completeness` (0.0–1.0): derived from state, not stored independently — computed: open_attention 0.15–0.45 (vary by weight for organic feel), next_step_known 0.75, parked 0.3 (but faint), done/released 1.0.
- `category` (enum: `people`, `decisions`, `logistics`, `home`, `work`, `money`, `health`, `ideas`, `other`) — used only for weekly summaries and Record patterns, never shown as UI chrome on the field.
- `label`: 2–4 words, human, lowercase-natural ("message Tom", "the garden"). Never verb-mandated task syntax.
- `next_step`: nullable text, set when the user answers "What's the next step?"

**Continuity (critical):** every extraction call receives the user's current open loops. The AI must match new mentions to existing loops (returning `matched_loop_id`) rather than duplicating. "The garden" on Tuesday is the same loop as "I keep thinking about the garden" from Sunday. A re-mention of an existing loop increments its `mention_count` and may raise its `weight` — visualised as the circle growing slightly. This is the difference between a product and a toy; do not skip it.

---

## 5. Design tokens & visual rules

`design_handoff_unloop` is authoritative. Core tokens to define as CSS custom properties (verify exact values against the handoff; these are the agreed direction):

```css
:root {
  --paper: #FAF7F2;          /* background everywhere */
  --ink: #2B2724;            /* primary text, near-black warm charcoal */
  --ink-soft: #6E675F;       /* secondary text */
  --accent: #C4633E;         /* terracotta — loops, CTAs, sparingly */
  --accent-soft: #E8C4B0;    /* parked/faded states */
  --closed: #8A8378;         /* completed circle stroke */
  --font-heading: 'Fraunces', Georgia, serif;   /* or handoff's serif */
  --font-ui: 'Inter', system-ui, sans-serif;
}
```

Non-negotiable visual rules:

1. Circles use **slightly imperfect, hand-drawn stroke quality** — implement as SVG paths with subtle randomised control-point jitter (seeded per-loop so a loop's "handwriting" is stable across renders), stroke-linecap round, stroke-width varying ±15% along the path. No geometrically perfect `<circle>` elements on the field.
2. No gradients, no glassmorphism, no shadows heavier than `0 1px 3px rgba(43,39,36,0.08)`, no dark-dashboard tropes.
3. Generous whitespace; the field breathes. Max ~12 visible loops before parked loops compress to the margins.
4. Motion is slow and deliberate: loop drift 20–40s cycles; the arc-close animation on release/done is 900ms ease-out and is **the** signature moment — build it beautifully (it will be screen-recorded for TikTok thousands of times).
5. **Dark mode is required** (the 3am use case): `--paper` → `#1C1917`, `--ink` → `#EDE7DF`, accent desaturated ~20%. Auto via `prefers-color-scheme` + manual toggle in settings.

---

## 6. Screens & features (full functional spec)

### 6.1 Capture ("Empty your head")

- Near-empty screen. Wordmark small at top. Centre: large soft circle (accent-soft fill) that **breathes** (scale 1.0→1.04, 3.5s loop). Microcopy beneath: "Empty your head."
- Tap → recording starts (single tap, no hold). Circle stroke animates; minimal waveform bars respond to input level (Web Audio AnalyserNode). Microcopy → "Listening…". Tap again to stop. Max recording 5 minutes (soft warning at 4:30).
- On stop: waveform gathers inward into a single dot (processing state), copy cycles: "Finding your loops…". Pipeline: upload → `/api/transcribe` → `/api/extract` → navigate to field with **new loops entering via a settle animation** (they drift in from centre outward to their positions).
- Also support **typed offload**: a small "or type it" affordance at the bottom for silent contexts. Same extraction pipeline.
- Error states: mic permission denied (calm explainer + typed fallback); transcription failure (retry, audio retained locally until success); extraction returns zero loops ("Sounds like a clear head. Nothing to hold." — this is a valid, pleasant outcome).

### 6.2 Loop field (main screen, default route)

- Header: "Occupying you" (serif). Beneath, quiet summary line: "4 need attention · 3 have a next step · 2 parked".
- The field: `d3-force` simulation — `forceManyBody` (gentle repulsion), `forceCollide` (radius = circle radius + label clearance), custom radial force pulling `open_attention` loops centreward proportional to `weight × emotional_intensity`, `next_step_known` mid-ring, `parked` to perimeter. Run simulation to layout, then apply slow ambient drift via Framer Motion (not continuous simulation — battery).
- Labels beneath each circle, `--font-ui`, 13px, `--ink-soft`.
- **No pinch/zoom in v1.** Fixed viewport. If loop count exceeds comfortable density (>14), parked loops collapse into a small cluster indicator at the edge ("6 parked") that expands on tap.
- Floating action: small breathing circle bottom-centre → Capture. Not a Material FAB; styled per handoff.
- **The toggle (§6.6):** top-right, two-state control reading "Occupying you / Released". This is the invert view.
- Empty state (all loops closed/parked): a single completed circle centre-field, copy: "A quiet head. It'll fill again — that's what heads do." Subtle link to Record view.

### 6.3 Loop detail (bottom sheet)

- Tap loop → field dims (opacity 0.35), sheet slides up (Framer Motion spring, gentle).
- Sheet contents: the loop's circle rendered large at top (same seed/jitter — it's *their* circle), label as serif heading, then the one question: **"What would help you release this?"**
- Five pill options (soft, generous tap targets ≥48px): `I've done it` · `I know the next step` · `Revisit later` · `It no longer matters` · `Still on my mind`.
- Behaviour:
  - **I've done it** → state `done`; sheet dismisses; arc sweeps closed on the field (the 900ms signature animation) with a single soft haptic tick (`platform.vibrate`), then fades over 3s.
  - **I know the next step** → inline prompt appears in-sheet: "What's the next step?" — text field with mic option (short Whisper call). On save: state `next_step_known`, arc fills to 0.75, circle drifts off-centre. Sheet shows brief confirmation: "Contained." (1.2s) then dismisses.
  - **Revisit later** → state `parked`; circle shrinks/fades to perimeter. Optional (not required) one-tap horizon chips: "next week · next month · someday" → sets `resurface_after`.
  - **It no longer matters** → state `released`; same close animation as done but stroke fades to `--closed` as it completes (visually distinct from done's accent close).
  - **Still on my mind** → state stays `open_attention`, `weight` +1 (cap 5), circle grows slightly on return. Follow-up microcopy, non-judgemental: "Okay. It can stay here where you can see it." Sheet dismisses. **No advice, no coaching, no "have you tried…".**
- Secondary affordances in sheet (small, quiet, bottom): "merge with another loop" (fixes AI splits), "edit label", "delete" (extraction error escape hatch — deletes without ceremony, excluded from Record).

### 6.4 Session summary (post-offload interstitial)

Shown after each offload session's loops settle (skippable, auto-dismisses to field after 6s):
- Before/after composition per handoff screen 4: tangle → settled arrangement.
- Copy: dynamic, e.g. "12 things were swirling. 4 need you, 5 have a next step, 3 released."
- Closing line (rotates from a small curated set, serif italic): "It's no longer all swirling around together."

### 6.5 Onboarding

- **Pre-first-session onboarding is three swipes maximum**, no data capture: (1) "Your head isn't storage." (2) "Speak freely. We'll find the loops." (3) "Close them, contain them, or set them down." → straight into Capture. Clerk sign-up happens *before* this (paid app), but keep it to one screen via Clerk's prebuilt component styled to tokens.
- **Post-first-session** (after they've felt the payoff): single card asking about the evening check-in: "Want a gentle 8pm nudge to empty your head?" Yes → schedule; No → never ask again via interstitial (settings only).

### 6.6 Released / Record view (the compounding layer — v1 REQUIRED)

The toggle inverts the field: released and done loops render as **complete, calm circles**, centrally clustered, accent and `--closed` strokes, most recent largest. Header: "Released". Summary line: cumulative counter — "47 loops released since March."
- Tapping a closed circle shows a minimal card: label, closed date, state (done vs released), original next_step if any, and a quiet "reopen" link.
- Scroll down within Record view → **weekly summaries** (§6.7) as a reverse-chronological feed of small serif cards.
- This view must feel like an achievement mirror, never an archive/table. No lists.

### 6.7 Weekly "state of your head" summary

- Vercel cron, Sunday 18:00 local (store user tz from browser at signup): for each active user with ≥1 event that week, call Claude (prompt §8.3) to produce a 2–3 sentence summary + counts. Store in `weekly_summaries`.
- Surface: card at top of Record view + optional email (Resend, opt-in at onboarding settings, single-click unsubscribe).
- Tone: observational mirror, never coaching. Good: "Work loops dominated this week, but you released more than you opened. Decisions are what linger longest for you." Banned: advice, praise-inflation, "keep it up!", streak language.

### 6.8 Parked-loop resurfacing

- Weekly cron (user's chosen check-in day, default Sunday): loops parked past `resurface_after` (or >21 days with none set) surface **as a single batch, in-app only** — a soft banner on the field: "3 parked loops are asking if they're still parked." Tap → sequential mini-sheets per loop with the five options. Never push-notify about parked loops. Cap: max once weekly.

### 6.9 Notifications (PWA phase)

- Web Push (VAPID) where supported; graceful absence on iOS if the user hasn't installed the PWA (iOS web push requires home-screen install — detect and explain gently).
- **Hard rules:** max ONE notification per day; only the user-chosen check-in ("Evening. Anything still swirling?") and at most one AI microstep nudge per day *only if* the user opted into microsteps — phrased as gap-closing, never chasing: "You said the next step on Tom was asking about Saturday — 30 seconds?" Every notification includes a "quieter please" action that halves frequency. All cadence controls in settings.

### 6.10 Settings

Account (Clerk portal), subscription (Stripe billing portal link), notifications & cadence, check-in time, dark mode, **privacy & data**: export my data (JSON download), delete everything (hard delete, double-confirm), and the privacy promise restated in plain English.

---

## 7. Database schema (Drizzle / Postgres)

```typescript
// /lib/db/schema.ts
import { pgTable, uuid, text, integer, real, timestamp, boolean, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';

export const loopState = pgEnum('loop_state', [
  'open_attention', 'next_step_known', 'parked', 'released', 'done'
]);
export const loopCategory = pgEnum('loop_category', [
  'people','decisions','logistics','home','work','money','health','ideas','other'
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  timezone: text('timezone').default('Europe/London'),
  checkinHour: integer('checkin_hour').default(20),        // local hour, null = off
  microstepsEnabled: boolean('microsteps_enabled').default(false),
  weeklyEmailEnabled: boolean('weekly_email_enabled').default(false),
  notificationFrequency: real('notification_frequency').default(1.0), // "quieter please" halves this
  stripeCustomerId: text('stripe_customer_id'),
  subscriptionStatus: text('subscription_status').default('trialing'), // trialing|active|past_due|canceled|lifetime
  trialEndsAt: timestamp('trial_ends_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const offloadSessions = pgTable('offload_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  inputMode: text('input_mode').notNull(),                 // 'voice' | 'text'
  transcript: text('transcript'),                           // kept; AUDIO IS NEVER STORED
  durationSeconds: integer('duration_seconds'),
  loopsExtracted: integer('loops_extracted').default(0),
  loopsMatched: integer('loops_matched').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('sessions_user_idx').on(t.userId, t.createdAt)]);

export const loops = pgTable('loops', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  label: text('label').notNull(),
  state: loopState('state').notNull().default('open_attention'),
  category: loopCategory('category').default('other'),
  weight: integer('weight').notNull().default(3),           // 1–5
  emotionalIntensity: integer('emotional_intensity').notNull().default(2), // 1–5
  nextStep: text('next_step'),
  mentionCount: integer('mention_count').default(1),
  visualSeed: integer('visual_seed').notNull(),             // stable hand-drawn jitter
  resurfaceAfter: timestamp('resurface_after'),
  firstSessionId: uuid('first_session_id').references(() => offloadSessions.id),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('loops_user_state_idx').on(t.userId, t.state),
  index('loops_resurface_idx').on(t.userId, t.resurfaceAfter),
]);

export const loopEvents = pgTable('loop_events', {           // full closure history — feeds Record & summaries
  id: uuid('id').defaultRandom().primaryKey(),
  loopId: uuid('loop_id').references(() => loops.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fromState: loopState('from_state'),
  toState: loopState('to_state').notNull(),
  note: text('note'),                                        // e.g. next_step text at transition
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('events_user_idx').on(t.userId, t.createdAt)]);

export const weeklySummaries = pgTable('weekly_summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  weekStart: timestamp('week_start').notNull(),
  summaryText: text('summary_text').notNull(),
  stats: jsonb('stats').notNull(),                           // {opened, released, done, parked, dominantCategory, ...}
  createdAt: timestamp('created_at').defaultNow(),
});

export const aiUsageLog = pgTable('ai_usage_log', {          // cost instrumentation (Ozzie pattern)
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  provider: text('provider').notNull(),                      // 'anthropic' | 'openai'
  operation: text('operation').notNull(),                    // 'transcribe' | 'extract' | 'weekly_summary' | 'next_step_stt'
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  audioSeconds: integer('audio_seconds'),
  estCostUsd: real('est_cost_usd'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

Rules: every AI call writes to `aiUsageLog`. Every state change writes to `loopEvents` inside the same transaction as the `loops` update. Hard-delete on account deletion (cascade), plus Stripe customer deletion via API.

---

## 8. AI specification

### 8.1 Transcription (`/api/transcribe`)

POST multipart audio → OpenAI Whisper (`whisper-1`, language hint `en`, temperature 0). Return `{ transcript, durationSeconds }`. **The audio buffer is never written to object storage or the DB — it exists in memory/tmp for the API call only and is discarded.** Log to `aiUsageLog`. Reject files >8MB or >5.5min with a friendly error.

### 8.2 Loop extraction (`/api/extract`) — the core prompt

Model: `claude-sonnet-4-6`, temperature 0.3, max_tokens 2000. Send the system prompt below plus a user message containing the transcript and current open loops. Parse strictly; on malformed JSON, one retry with an appended "Return ONLY valid JSON" instruction; on second failure, surface the calm error state.

**System prompt (use verbatim):**

```
You extract "open loops" from a person's spoken mental offload. An open loop is one distinct thing occupying their mental space: an unresolved task, a decision they haven't made, a worry, a conversation they need to have, or a recurring thought.

You will receive:
1. TRANSCRIPT: a raw, rambling voice transcript.
2. EXISTING_LOOPS: the person's current open loops as JSON (may be empty).

Rules:
- Extract only genuinely distinct loops. A ramble mentioning the same worry three ways is ONE loop.
- CONTINUITY IS CRITICAL: if a mention matches an existing loop in meaning (not just wording), return it as a match with that loop's id, not a new loop. "the garden", "sort the garden out", and "I keep thinking about what to do outside" are the same loop.
- Labels: 2–4 words, natural and human, in the person's own vocabulary where possible ("message Tom", "the job decision", "mum's birthday"). Never rewrite into formal task syntax. Never start every label with a verb.
- weight (1–5): how much mental space this occupies, judged from repetition, dwell time, and framing.
- emotional_intensity (1–5): how emotionally charged it sounds. Practical errands are 1–2 even if urgent. Relationship, identity, health and money worries run higher.
- category: one of people, decisions, logistics, home, work, money, health, ideas, other.
- If the person states a next step for something ("I just need to text him"), capture it in next_step.
- Ignore filler, scene-setting, and things the person explicitly says are fine or resolved.
- If the transcript contains no loops, return an empty array. Do not invent loops.
- Never include advice, commentary, or judgement anywhere in the output.

Return ONLY valid JSON matching:
{
  "new_loops": [
    { "label": string, "weight": 1-5, "emotional_intensity": 1-5,
      "category": string, "next_step": string | null }
  ],
  "matched_loops": [
    { "loop_id": string, "weight_delta": 0 | 1, "next_step": string | null }
  ]
}
```

Server-side post-processing: assign `visualSeed = hash(label + userId)`; for `matched_loops`, increment `mention_count`, apply `weight_delta` (cap 5), update `next_step` if provided and state accordingly (`next_step` present → `next_step_known` unless loop is terminal).

### 8.3 Weekly summary prompt

Model `claude-sonnet-4-6`, temperature 0.5. Input: the week's `loopEvents` with labels/categories + counts. System prompt核心 rules: 2–3 sentences; observational mirror, second person; name the dominant category and one genuine pattern; **never** advise, praise, use exclamation marks, or reference streaks/productivity. Example register: "A heavy week for work loops, but most of them left with a next step. The job decision has now outlasted everything opened alongside it."

### 8.4 Safety & scope guardrails (required)

The extraction endpoint must detect crisis content. Add to server-side post-processing: a lightweight classifier call (same Claude request — add to the extraction system prompt: `Also return "flag": "crisis" if the transcript contains references to self-harm, suicide, or harming others; otherwise "flag": null.`). If flagged: loops still render normally (never punish disclosure), but the session summary is replaced by a calm, non-alarmist card: "Some of what you said sounds heavy. Unloop is a place to set thoughts down, not a source of support — if things feel like too much, talking to someone you trust or a professional can genuinely help. In the UK you can call or text Samaritans on 116 123, any time." Do not gate, moralise, or repeat the card more than once per week. Unloop must never present itself as therapy, and the AI must never generate advice about the *content* of loops.

---

## 9. Landing page (marketing site — build first, it doubles as the demand-test page)

Route: `/` (public). Structure top-to-bottom:

1. **Hero.** Paper background. Left (or stacked on mobile): serif H1 — "Empty your head." Sub: "Speak freely. Unloop turns the swirl into a calm field of open loops — and helps you close them, contain them, or set them down." Primary CTA: "Start unlooping — 7 days free" (→ Clerk sign-up). Quiet secondary: "See how it works" (anchor scroll). Right: **HeroFieldDemo** — a live, self-playing animation (not a video): a snippet of "transcript" text streams in, then dissolves into 6 loops that settle into the field arrangement; one arc sweeps closed on a loop; loops drift. Pure SVG/Framer Motion, ~12s cycle, respects `prefers-reduced-motion` (falls back to static field). This component is the money shot — build it properly; it will also be screen-recorded for social content.
2. **The problem, in one line.** Serif pull-quote band: "Your working memory isn't storage. Every open loop you're holding is rented headspace."
3. **How it works — three hero cards** (per handoff card styling): (a) *Empty your head* — capture screen visual, "Talk for two minutes. No structure needed." (b) *See what's occupying you* — field visual, "Every unresolved thing becomes a loop. Big and bold means it's taking space." (c) *Close it, contain it, or set it down* — detail sheet visual, "Done, next-step-known, parked, or released. Closure without a to-do list."
4. **The science, lightly.** Two sentences on the Zeigarnik effect (unfinished tasks intrude on your thoughts more than finished ones — and a concrete next step quiets a loop almost as well as finishing it). No citations wall, no clinical claims (§12).
5. **The Record.** Split visual: "Occupying you / Released" toggle shown mid-flip. Copy: "Watch the released pile grow. Proof your head has been doing the work."
6. **Privacy band.** Ink background inversion, short: "Spoken, structured, deleted. Your audio is transcribed and immediately discarded. Your thoughts are never used to train AI. Export or erase everything, any time."
7. **Pricing.** Annual card visually primary: **£34.99/year** ("under £3 a month"). Monthly beside it, smaller: £4.99/month. Founding Member card: **£79 lifetime — first 200 people**, live counter of remaining slots (reads from Stripe product metadata / DB counter). All CTAs → trial.
8. **FAQ** (accordion, 6 items): not-a-todo-app; what happens to my audio; can I type instead; what if I have loads of loops; cancelling; is this therapy ("No — Unloop is a thinking tool, not a health service").
9. Footer: privacy policy, terms, contact, socials.

**Pre-launch mode:** an env flag `NEXT_PUBLIC_PRELAUNCH=true` swaps every CTA for an email-capture field ("Get early access") writing to a `waitlist` table + PostHog event. This makes the landing page double as the painted-door demand test with zero rework.

SEO/meta: title "Unloop — Empty your head"; description leaning on *mental offload, brain dump, mental load, racing thoughts, clear your head* vocabulary; OG image = the hero field frame.

---

## 10. Payments (Stripe)

- Products: `unloop_annual` £34.99/yr, `unloop_monthly` £4.99/mo (both with 7-day trial via Checkout `trial_period_days: 7`, card required upfront — hard paywall), `unloop_lifetime` £79 one-time (cap enforced in app: refuse checkout when sold count ≥200).
- Flow: Clerk sign-up → immediately into Stripe Checkout (annual preselected) → success → onboarding → capture. No free tier; unauthenticated/unsubscribed users only ever see marketing pages.
- Webhooks: `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed` → update `users.subscriptionStatus`. `past_due` → banner in-app, 7-day grace, then read-only mode (field visible, capture disabled) — never delete their data for non-payment.
- Trial reminder email via Resend on day 5 ("Your trial ends in 2 days") — required for App Store parity later and basic decency.
- Billing portal link in settings for cancel/upgrade/card changes. VAT: enable Stripe Tax, GB.

---

## 11. Privacy, GDPR & data handling (build these, don't defer)

- Audio: never persisted (§8.1). State this in the privacy policy and settings.
- Transcripts: stored (needed for continuity/quality), encrypted at rest by Neon; add a settings toggle "Don't keep my transcripts" → store only extracted loops, transcript discarded post-extraction.
- Data export: `/api/me/export` → JSON of loops, events, sessions (transcripts if kept), summaries.
- Deletion: settings → double confirm → cascade delete + Stripe customer delete + Clerk user delete + PostHog `$delete_person`.
- Write a plain-English privacy policy page (no template legalese dump) covering: what's collected, the audio-deletion promise, processors (Neon, Vercel, Clerk, Stripe, Anthropic, OpenAI, PostHog EU, Resend), no-training commitment, UK GDPR rights, contact.
- PostHog: EU host, no session recording on app screens (transcript privacy), autocapture off in the app shell — explicit events only (§13).

---

## 12. Copy rules (ASA compliance + voice) — enforce across ALL surfaces

**Banned:** any claim to treat, cure, manage, or reduce anxiety, depression, ADHD, or any condition; the words "therapy", "therapeutic", "clinically", "mental health tool"; medical framing of outcomes; streak/guilt language ("don't break your streak", "you missed a day"); productivity bro-speak ("crush", "10x", "optimize your mind").
**Allowed vocabulary:** mental load, racing thoughts, overthinking, a full head, swirling, open loops, quieter head, clarity, set it down, contained, released.
**Voice:** calm, plain, slightly literary; British English throughout (organise, colour); serif for emotional lines, sans for functional UI; full stops, no exclamation marks anywhere in-app.

---

## 13. Analytics events (PostHog — explicit, minimal)

`signup_started`, `trial_started(plan)`, `offload_started(mode)`, `offload_completed(loops_new, loops_matched, duration)`, `loop_state_changed(from, to, category, weight)`, `field_toggle_used(view)`, `record_viewed`, `weekly_summary_viewed`, `parked_resurfaced(count)`, `notification_optin(type)`, `notification_quieter_tapped`, `pwa_installed`, `subscription_converted(plan)`, `subscription_canceled(reason?)`, `data_exported`, `account_deleted`.
Funnels to configure: landing → signup → trial → first offload → first loop closed → D7 return → paid conversion.

---

## 14. Build phases & acceptance criteria

**Phase 1 — Foundation (do first):** repo scaffold, tokens/theme (light+dark), Drizzle schema + migrations, Clerk, Stripe products + checkout + webhooks, landing page complete with HeroFieldDemo and prelaunch flag. *Accept: a visitor can view the full landing page on mobile, join the waitlist (prelaunch) or pay and land in an empty app shell.*

**Phase 2 — Core loop (the product):** capture (voice + typed, offline queue), transcribe + extract pipeline with continuity, loop field with force layout + drift + hand-drawn strokes, detail sheet with all five closures + signature close animation, session summary. *Accept: speak a 60-second ramble mentioning 5 things including one previously-captured topic → field shows 4 new loops + 1 grown existing loop, no duplicates; closing a loop plays the sweep at 60fps on a mid-range Android; full flow works offline-then-online.*

**Phase 3 — Compounding layer:** Record view + toggle + cumulative counter, weekly summaries (cron + Claude + Record feed + opt-in email), parked resurfacing cron. *Accept: a seeded user with 3 weeks of events sees a correct counter, 3 summary cards in register (§8.3 tone), and a resurface banner for stale parked loops.*

**Phase 4 — Retention & polish:** PWA install flow + manifest + service worker, web push check-in with frequency controls + "quieter please", settings complete (export, delete, transcript toggle), crisis flag card, empty states, error states, `prefers-reduced-motion`, accessibility pass (labels announced, sheet focus-trapped, contrast AA on all text, tap targets ≥48px). *Accept: Lighthouse PWA installable; a11y ≥95; every screen has a designed empty/error state.*

**Deferred (do NOT build now, but don't preclude):** Capacitor wrap + iOS/Android store builds, home-screen widgets (native phase flagship), pinch/zoom field, integrations of any kind, social features, streaks (never).

---

## 15. Edge cases & quality bar checklist

- Two rapid offloads in a row → second extraction receives loops from the first (no race; extraction serialised per user).
- 25+ open loops → parked cluster compression engages; field never becomes unreadable; gently suggest a "release pass" once (dismissable, never again that month).
- Whisper mishears a name → label edit affordance exists (§6.3) and edited labels feed back as EXISTING_LOOPS context.
- User says something with no loops ("today was actually fine") → the pleasant zero-state, logged as a session.
- Very long transcript (5 min) → chunk if needed; Claude call must stay <2000 output tokens; loops capped at 12 per session (merge smallest weights beyond that).
- iOS Safari: MediaRecorder mime fallback tested; audio-context resumed on gesture; safe-area respected in the sheet.
- All timestamps stored UTC, rendered in user tz; crons fan out by user tz hour.
- Rate limiting on `/api/transcribe` and `/api/extract` (per-user: 20/day soft, 40 hard with friendly copy) — protects AI spend.
- Seed script (`pnpm seed`) creating a demo user with 3 weeks of realistic loop history for development and screenshots.

---

## 16. Definition of done (whole project)

A new user on a phone can: land on the marketing page, understand the product in 10 seconds from the hero animation, start a trial with annual preselected, speak a genuine ramble, watch it become loops, close one with the signature animation, contain one with a next step, park one, flip to Released and see the beginning of their record, install the PWA when prompted after the session, receive one gentle evening check-in the next day, and export or delete everything from settings. Total AI cost per typical daily-use user: logged, visible in `aiUsageLog`, and under ~£0.15/month at expected usage. Nothing anywhere looks, reads, or behaves like a task manager.
