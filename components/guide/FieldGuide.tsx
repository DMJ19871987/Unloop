"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LoopCircle } from "@/components/field/LoopCircle";
import {
  FieldMotionToggle,
  type FieldMotionMode,
} from "@/components/field/FieldMotionToggle";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-ui text-[10px] uppercase tracking-[2.4px] text-ink-placeholder">
      {children}
    </p>
  );
}

function GuideLoop({
  label,
  state,
  weight,
  intensity,
  seed,
  size,
  faded = false,
}: {
  label: string;
  state: "open_attention" | "next_step_known" | "parked";
  weight: number;
  intensity: number;
  seed: number;
  size: number;
  faded?: boolean;
}) {
  return (
    <LoopCircle
      label={label}
      state={state}
      weight={weight}
      emotionalIntensity={intensity}
      visualSeed={seed}
      size={size}
      labelMaxWidth={112}
      labelOpacity={faded ? 0.5 : 0.86}
      compactLabel
      forField
    />
  );
}

function MiniField() {
  const rows = [
    {
      label: "Ready to move",
      short: "Ready",
      detail: "A next step is known",
      loops: [
        { label: "Call the bank", state: "next_step_known" as const, weight: 3, intensity: 2, seed: 17, size: 48 },
        { label: "Send the draft", state: "next_step_known" as const, weight: 2, intensity: 1, seed: 29, size: 40 },
      ],
    },
    {
      label: "Needs clarity",
      short: "Clarify",
      detail: "Still asking for attention",
      loops: [
        { label: "Work decision", state: "open_attention" as const, weight: 5, intensity: 4, seed: 41, size: 66 },
        { label: "Plans with Sam", state: "open_attention" as const, weight: 3, intensity: 2, seed: 53, size: 50 },
      ],
    },
    {
      label: "Waiting",
      short: "Waiting",
      detail: "Parked or outside your control",
      loops: [
        { label: "Builder reply", state: "parked" as const, weight: 3, intensity: 2, seed: 67, size: 42 },
      ],
    },
  ];

  return (
    <div className="overflow-hidden border-y border-border/70 bg-paper/28" aria-label="Example mental field">
      {rows.map((row, index) => (
        <div
          key={row.short}
          className={`grid min-h-[150px] grid-cols-[84px_1fr] sm:min-h-[170px] sm:grid-cols-[132px_1fr] ${
            index < rows.length - 1 ? "border-b border-border/70" : ""
          }`}
        >
          <div className="flex flex-col justify-center border-r border-border/70 px-3 sm:px-5">
            <span className="font-ui text-[9px] font-medium uppercase tracking-[1.2px] text-ink-soft sm:text-[10px]">
              <span className="sm:hidden">{row.short}</span>
              <span className="hidden sm:inline">{row.label}</span>
            </span>
            <span className="mt-2 hidden font-ui text-[10px] leading-snug text-ink-placeholder sm:block">
              {row.detail}
            </span>
          </div>
          <div className="relative flex items-center justify-around gap-2 px-2 sm:px-8" aria-hidden>
            {row.loops.map((loop, loopIndex) => (
              <div
                key={loop.label}
                className={loopIndex % 2 === 0 ? "-translate-y-2" : "translate-y-3"}
              >
                <GuideLoop {...loop} faded={loop.state === "parked"} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MovementDemo() {
  const [mode, setMode] = useState<FieldMotionMode>("fixed");
  const reducedMotion = useReducedMotion();
  const moving = mode === "float" && reducedMotion !== true;
  const loops = [
    { label: "Decision", x: "18%", y: "25%", seed: 81, delay: 0 },
    { label: "Email Alex", x: "51%", y: "52%", seed: 93, delay: 1.4 },
    { label: "Weekend plan", x: "78%", y: "24%", seed: 107, delay: 2.6 },
  ];

  return (
    <div className="border-y border-border/70 bg-paper/28 px-4 py-5 sm:px-7">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="font-ui text-xs text-ink-muted">
          Try the movement control
        </p>
        <FieldMotionToggle mode={mode} onChange={setMode} />
      </div>
      <div className="relative h-[190px] overflow-hidden border-y border-border/50 field-surface sm:h-[220px]">
        {loops.map((loop, index) => (
          <motion.div
            key={loop.label}
            className="absolute"
            style={{ left: loop.x, top: loop.y }}
            animate={
              moving
                ? {
                    x: index === 1 ? [0, 18, -12, 8, 0] : [0, -14, 16, -6, 0],
                    y: index === 1 ? [0, -9, 12, -5, 0] : [0, 10, -7, 6, 0],
                  }
                : { x: 0, y: 0 }
            }
            transition={{
              duration: 18 + index * 3,
              delay: loop.delay,
              repeat: moving ? Infinity : 0,
              ease: "easeInOut",
            }}
          >
            <div className="-translate-x-1/2 -translate-y-1/2">
              <GuideLoop
                label={loop.label}
                state="open_attention"
                weight={index === 0 ? 4 : 3}
                intensity={index === 0 ? 4 : 2}
                seed={loop.seed}
                size={index === 0 ? 52 : 44}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function FieldGuide() {
  return (
    <div className="pb-24">
      <header className="mx-auto flex max-w-5xl items-start justify-between gap-5 px-5 pb-10 pt-8 sm:px-8 sm:pt-12">
        <div className="animate-float-in">
          <Eyebrow>Field guide</Eyebrow>
          <h1 className="mt-2 font-heading text-[32px] font-medium leading-tight text-ink sm:text-[42px]">
            Reading your loops
          </h1>
          <p className="mt-4 max-w-xl font-ui text-sm leading-relaxed text-ink-muted sm:text-base">
            The field is not a task list. It shows what is occupying you, what can move, and what can rest for now.
          </p>
        </div>
        <Link
          href="/field"
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-border bg-sheet/70 px-4 font-ui text-xs text-ink-soft shadow-subtle transition hover:border-accent/40 hover:text-accent-selected"
        >
          Back to field
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-7 max-w-xl">
          <Eyebrow>Meaningful gravity</Eyebrow>
          <h2 className="mt-2 font-heading text-2xl text-ink">Three places a loop can sit</h2>
          <p className="mt-3 font-ui text-sm leading-relaxed text-ink-muted">
            Drag a loop between bands whenever its relationship to you changes. The field reorganises without losing the loop or its history.
          </p>
        </div>
        <MiniField />
      </section>

      <section className="border-y border-border/60 bg-sheet/26">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="mb-8 max-w-xl">
            <Eyebrow>The marks</Eyebrow>
            <h2 className="mt-2 font-heading text-2xl text-ink">What a loop is telling you</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="grid grid-cols-[96px_1fr] items-center gap-4 sm:grid-cols-1">
              <div className="flex h-28 items-center justify-center" aria-hidden>
                <GuideLoop label="Taking space" state="open_attention" weight={5} intensity={4} seed={121} size={76} />
              </div>
              <div>
                <h3 className="font-heading text-lg text-ink">Size is mental weight</h3>
                <p className="mt-2 font-ui text-sm leading-relaxed text-ink-muted">
                  Larger loops are taking more room in your attention. Size is not importance or priority.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[96px_1fr] items-center gap-4 sm:grid-cols-1">
              <div className="flex h-28 items-center justify-center" aria-hidden>
                <GuideLoop label="Next step known" state="next_step_known" weight={3} intensity={2} seed={137} size={62} />
              </div>
              <div>
                <h3 className="font-heading text-lg text-ink">The arc shows its state</h3>
                <p className="mt-2 font-ui text-sm leading-relaxed text-ink-muted">
                  A fuller, quieter arc means the loop has a clearer route towards closure.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[96px_1fr] items-center gap-4 sm:grid-cols-1">
              <div className="flex h-28 items-center justify-center" aria-hidden>
                <GuideLoop label="Waiting" state="parked" weight={3} intensity={2} seed={149} size={50} faded />
              </div>
              <div>
                <h3 className="font-heading text-lg text-ink">Faded loops are resting</h3>
                <p className="mt-2 font-ui text-sm leading-relaxed text-ink-muted">
                  Waiting loops remain available without asking for the same amount of attention.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <Eyebrow>Moving a loop</Eyebrow>
          <h2 className="mt-2 font-heading text-2xl text-ink">Drag when something changes</h2>
          <p className="mt-3 font-ui text-sm leading-relaxed text-ink-muted">
            Move a loop to Ready when you know what happens next, Clarify when it still needs thought, or Waiting when it is parked or outside your control.
          </p>
          <p className="mt-3 font-ui text-sm leading-relaxed text-ink-muted">
            If you move something to Ready, Unloop asks you to name the next step before it settles there.
          </p>
        </div>
        <div className="relative h-[240px] overflow-hidden border-y border-border/70 bg-paper/28 field-surface" aria-hidden>
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
          <div className="absolute left-4 top-4 font-ui text-[9px] uppercase tracking-[1.2px] text-ink-placeholder">Ready</div>
          <div className="absolute bottom-4 left-4 font-ui text-[9px] uppercase tracking-[1.2px] text-ink-placeholder">Clarify</div>
          <div className="absolute bottom-[22%] left-[24%]">
            <GuideLoop label="Project scope" state="open_attention" weight={4} intensity={3} seed={163} size={58} />
          </div>
          <div className="absolute left-[58%] top-[16%] rounded-md border border-border bg-sheet/90 px-3 py-2 shadow-subtle">
            <p className="font-ui text-[10px] text-ink-faint">Name the next step</p>
            <p className="mt-1 font-ui text-xs text-ink-soft">Send the revised outline</p>
          </div>
          <div className="absolute left-[49%] top-[47%] h-[58px] border-l border-dashed border-accent/55" />
        </div>
      </section>

      <section className="border-y border-border/60 bg-sheet/26">
        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <Eyebrow>Movement</Eyebrow>
            <h2 className="mt-2 font-heading text-2xl text-ink">Settled or gently alive</h2>
            <p className="mt-3 font-ui text-sm leading-relaxed text-ink-muted">
              Fixed keeps the force-settled composition still. Float lets loops slowly move, make room for one another, and return towards their own area.
            </p>
            <p className="mt-3 font-ui text-sm leading-relaxed text-ink-muted">
              Movement changes the atmosphere only. It never changes a loop&apos;s meaning or state.
            </p>
          </div>
          <MovementDemo />
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-2 lg:items-center">
        <div className="flex min-h-[260px] items-center justify-center border-y border-border/70 bg-paper/28 field-surface" aria-hidden>
          <GuideLoop label="Job application" state="open_attention" weight={5} intensity={4} seed={181} size={82} />
        </div>
        <div>
          <Eyebrow>Inside a loop</Eyebrow>
          <h2 className="mt-2 font-heading text-2xl text-ink">Tap for the detail and history</h2>
          <p className="mt-3 font-ui text-sm leading-relaxed text-ink-muted">
            Opening a loop reveals why it is present, its next step when one exists, and the history of how it has moved.
          </p>
          <div className="mt-6 border-l border-border pl-5">
            <p className="font-ui text-[10px] uppercase tracking-[1.6px] text-ink-placeholder">Next step</p>
            <p className="mt-1 font-heading text-base text-ink-soft">Review the role notes</p>
            <p className="mt-5 font-ui text-[10px] uppercase tracking-[1.6px] text-ink-placeholder">History</p>
            <p className="mt-1 font-ui text-sm text-ink-muted">Mentioned twice. Moved to Clarify today.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-5xl justify-center px-5 pt-4 sm:px-8">
        <Link
          href="/field"
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-accent px-6 font-ui text-sm font-medium text-white shadow-soft transition hover:bg-accent-hover"
        >
          Return to your field
        </Link>
      </div>
    </div>
  );
}
