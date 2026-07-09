# Handoff: Unloop — Visual Decompression Tool (Mobile App)

## Overview
Unloop is a mobile app for offloading unresolved thoughts. The user speaks freely; the app converts the offload into "open loops" — things still occupying mental space — each rendered as an incomplete, hand-drawn circle. The emotional job is **empty your head, see what's occupying you, watch the swirl reduce**. This is explicitly **not** a task manager: no checkboxes, no progress bars, no lists, no streaks.

This package covers 4 screens: Capture, Loop Field (main screen), Loop Detail (bottom sheet), Session Summary (before/after).

## About the Design Files
The files in this bundle (`Unloop.dc.html`, `Loop.dc.html`) are **design references built in HTML/React** — high-fidelity prototypes showing intended look, layout, and behavior. They are not production code to import as-is. The task is to **recreate these designs in the target codebase's existing environment** (e.g. SwiftUI, React Native, Flutter, or whatever the app already uses) following its established patterns, navigation, and component libraries. If no mobile framework exists yet, choose the most appropriate one for the project.

`ios-frame.jsx` and `support.js` are prototype scaffolding only (device bezel chrome for the mockup canvas) — do not port these; they have no equivalent in a real app shell.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and stroke treatment are intentional and should be recreated precisely. Exact hex values and type specs are below.

## Design System

### Colors
- Background (paper): `#FAF7F2`
- Canvas surround (marketing/dev canvas only, not app): `#E7E1D7`
- Ink / primary text: `#2E2A26`
- Secondary text: `#4A4038`
- Tertiary / muted text: `#7C6F62`, `#9A8E80`
- Faint / placeholder text: `#A99C8E`, `#C1B4A5`
- **Accent (muted terracotta)** — the single accent color, used sparingly for "demanding attention" state and primary actions: `#C1633F` (loop stroke), `#B15A38` (text/link), `#8A3E22` (link hover / selected pill text)
- Accent tint (selected pill background): `#F2E1D8`
- Neutral loop stroke (has a next step): `#6E635A`
- Faded loop stroke (parked/resolved): `#A99C8E` at ~0.4 opacity
- Sheet surface: `#FCFAF6`
- Borders / hairlines: `#E3D9CD`, `#EADFD2`

### Typography
- **Headings / serif**: Spectral (400/500/600, italic 400/500 available) — used for screen titles, loop-detail name, and the closing summary line (italic).
- **UI / sans**: Hanken Grotesk (400/500/600) — used for all body copy, labels, buttons, microcopy.
- Loop labels: Hanken Grotesk, 13px, weight 500.
- Screen titles: Spectral, ~21–27px, weight 500.
- Summary/quote line: Spectral italic, 17px.
- Minimum text size respects mobile hit-target/legibility norms; nothing below 11px (monospace annotations only, not in-app).

### The "Loop" — core visual unit
Each open loop is an incomplete circle, drawn with a slightly imperfect (hand-drawn) stroke rather than a perfect vector arc. In the prototype this is done with an SVG `feTurbulence` + `feDisplacementMap` filter over a circle whose `stroke-dasharray` is set to the completion arc. In production, approximate this with:
- A circular arc/ring shape, allowing a hand-jitter/wobble (slight path irregularity — can be a pre-baked "imperfect circle" SVG path per size bucket, or a subtle noise displacement if the platform supports SVG filters).
- Arc drawn starting at 12 o'clock (rotate -90°), sweeping clockwise for `arc` fraction of the circle (0–1).

**Visual grammar (must be preserved exactly):**
- **Size = mental space occupied.** Larger diameter = occupying more of the user's head. Range used: ~46px (faded/small) to ~150px (largest, most occupying).
- **Stroke weight = demand.** Thicker stroke (~4–4.5px) = still actively demanding attention (terracotta accent color `#C1633F`). Medium stroke (~3px) = has a next step, neutral color `#6E635A`. Thin stroke (~2px) = safely parked/resolved, faint color `#A99C8E` at low opacity (~0.4).
- **Arc completeness = closeness to resolution.** Lower `arc` value (e.g. 0.4–0.55) = far from resolved, big open gap. Higher `arc` (0.8–0.95) = nearly closed. `arc = 1` = fully closed thin circle = resolved (these should be fading out of the composition).
- **Position = a soft center of gravity, not a grid.** Big, bright, low-arc loops (most demanding) cluster near the center of the canvas. Loops with a known next step (medium stroke) form a looser band around them. Faint/resolved loops drift outward toward the edges. This spatial logic reinforces size/stroke — do not lay loops out randomly or in a grid; give the composition a deliberate center-heavy structure with generous negative space between circles.
- Every open loop has a short 2–4 word label below it in muted ink, opacity reduced for parked loops.

### Motion (annotate/implement as native transitions — not literal CSS keyframes)
- **Capture screen**: record circle breathes slowly (scale 1→1.05, ~3.6s ease-in-out loop), two concentric rings pulse outward and fade (expanding ring animation, staggered), an 11-bar waveform responds to voice input with each bar animating height independently while listening.
- **Loop field**: loops drift very slowly and continuously (slow float/parallax, not noticeable frame-to-frame — more like a living, settling composition than an animation). As a loop resolves, it should visibly migrate outward toward the edge and fade over a few seconds.
- **Loop detail sheet**: slides up from the bottom over a dimmed/scaled-back loop field (the field visible behind at ~45% opacity + a light overlay). Selecting a resolution option sweeps the loop's arc closed with a slow, satisfying draw animation (animate `arc`/stroke-dashoffset toward 1 over ~600–900ms, ease-out).
- **Session summary**: the "before" cluster of loops should be shown, then settle/reflow into the "after" arrangement (a still image is acceptable if animating a full relayout is out of scope; if animating, ease loops from before-positions to after-positions over ~1–1.5s).

## Screens

### 1. Capture
**Purpose**: Entry point. User taps to start speaking freely; this is the "empty your head" moment.
**Layout**: Full-bleed paper background, no nav chrome. Vertically centered column: headline copy → large circular record button with pulse rings → waveform → status text.
**Components**:
- Small uppercase wordmark "Unloop" at top, letter-spacing 3px, `#C1B4A5`, 12px.
- Headline: "Empty your head." — Spectral 500, 27px, `#2E2A26`, centered.
- Record button: 216×216px outer bounds. Layers (back to front): expanding terracotta ring outline, expanding lighter ring outline (staggered), soft filled breathing disc (`#F1E1D8`), solid inner button 148×148px (`#EAD3C6`) with a microphone glyph (stroke `#B15A38`).
- Waveform: 11 vertical bars, 4px wide, rounded, alternating `#D8B7A5` (idle) / `#C1633F` (active/loud), animating height independently while listening.
- Status text: "Listening…", 14px, `#9A8E80`.
**Content**: "Empty your head." / "Listening…"

### 2. Loop Field (main screen)
**Purpose**: Shows everything currently occupying the user's head as a living field of loops. Tapping a loop opens its detail sheet.
**Layout**: Header block (title + summary line) pinned near top; below it, a free-form canvas (not a grid/list) where loops are absolutely positioned per the center-of-gravity rule above.
**Components**:
- Title: "Occupying you" — Spectral 500, 21px.
- Summary line: "4 need attention · 3 have a next step · 2 released" — 12.5px, `#9A8E80`.
- 9 loops shown, mixed states, labels: Job application, The garden, Message Tom, Call the bank (all terracotta/demanding, low-mid arc, large-medium size, centered); Reply to Sam, Book flights, Fix the shelf (neutral `#6E635A`, higher arc, medium size, mid-band around the center cluster); Old argument, Dentist (faint `#A99C8E`, near-closed arc, small, drifted to the edge).
**Interaction**: Tap any loop → opens Loop Detail sheet for that loop.

### 3. Loop Detail (bottom sheet)
**Purpose**: Single decision point for releasing a loop from mental space.
**Layout**: Loop field visible behind, dimmed. Sheet slides up from bottom, rounded top corners (32px radius), covers roughly bottom 64% of screen.
**Components**:
- Drag handle: 42×5px pill, `#E3D9CD`, centered.
- The loop itself, centered, ~112px, matching its state in the field.
- Loop name: Spectral 500, 26px, centered, e.g. "Job application".
- Prompt: "What would help you release this?" — 15px, `#8A7E70`, centered.
- Five pill buttons, wrapped/centered, 11px vertical / 17px horizontal padding, 100px radius:
  1. "I've done it" — default state (white bg, `#E3D9CD` border, `#4A4038` text)
  2. "I know the next step" — **selected state shown**: `#F2E1D8` bg, 1.5px `#C1633F` border, `#8A3E22` text, weight 500
  3. "Revisit later" — default state
  4. "It no longer matters" — default state
  5. "Still on my mind" — default state
- Conditional inline field (shown only when "I know the next step" is selected): label "What's the next step?" (12px, `#A99C8E`), below it a rounded input row (16px radius, `#F6EFE6` bg, `#EADFD2` border) with placeholder text "Draft the cover letter…" and a mic icon for voice input, matching the capture screen's mic glyph.
**Interaction**: Selecting a pill sets that loop's resolution state and (per motion notes) sweeps its arc closed on dismiss. Selecting "I know the next step" reveals the inline text/voice field; any other pill dismisses the sheet without it.

### 4. Session Summary
**Purpose**: Before/after moment closing a capture session, giving a felt sense of reduced mental load.
**Layout**: Title, then two stacked labeled zones ("Before" / "After") each containing a loop cluster, separated by a small downward chevron, then a closing quote line.
**Components**:
- Title: "A quieter head" — Spectral 500, 22px, centered.
- "Before" label: 11px, letter-spacing 2.5px, uppercase, `#B4A79A`.
- Before cluster: 12 loops, all terracotta/demanding state, small-medium sizes (46–70px), low-mid arc (0.3–0.62), tightly packed/overlapping-adjacent to read as "tangled."
- Chevron divider icon, `#CDBFAF`.
- "After" label: same style as Before label.
- After cluster: 12 loops — 4 terracotta/demanding (larger, arc ~0.55–0.62), 5 neutral/next-step (medium, arc ~0.86–0.92), 3 faint/faded (small, arc ~1, opacity ~0.38) — spaced generously, calm.
- Closing line: Spectral italic, 17px, `#5C5248`, centered: **"It's no longer all swirling around together."**

## State Management
- Each loop needs: `id`, `label`, `size` (mental-space weight, derived or user/AI-assigned), `arc` (0–1 completion), `status` (`live` | `next-step` | `parked` | `released` | `resolved`), and for `next-step`, an optional `nextStepText`.
- Loop field position should be computed from `status`/`arc`/`size` (center-of-gravity layout), not hardcoded — consider a simple radial/force layout keyed off those fields so new loops and status changes reflow naturally.
- Capture flow needs a recording/transcribing state machine (idle → listening → processing → loops extracted).
- Session summary needs a snapshot of loop states at session start ("before") vs. current ("after").

## Assets
No external image assets. One inline icon (capsule mic glyph) is hand-drawn as an SVG stroke path in the prototype — recreate as a vector icon in the app's icon set. Fonts are Google Fonts: Spectral and Hanken Grotesk (both open source, safe to bundle).

## Files
- `Unloop.dc.html` — all 4 screens, laid out side by side in a review canvas (each screen wrapped in an iPhone frame for presentation only — the frame chrome is not part of the app design).
- `Loop.dc.html` — the reusable loop-circle component (props: `size`, `arc`, `stroke`, `sw` [stroke width], `op` [opacity], `label`, `labelColor`, `labelOp`). Reference this for the exact SVG construction of the loop primitive.
- `ios-frame.jsx`, `support.js` — prototype-only scaffolding (device bezel + runtime), not part of the design.
