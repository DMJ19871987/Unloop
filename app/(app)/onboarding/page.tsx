"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const PANELS = [
  { id: 1, text: "Your head isn't storage." },
  { id: 2, text: "Speak freely. We'll find the loops." },
  { id: 3, text: "Close them, contain them, or set them down." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [panel, setPanel] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const isLast = panel === PANELS.length - 1;

  const advance = () => {
    if (isLast) {
      finish();
    } else {
      setPanel((p) => p + 1);
    }
  };

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingComplete: true }),
      });
    } catch {
      // Continue to offload even if flag save fails
    }
    router.push("/offload");
  };

  const swipeConfidence = 8000;
  const swipePower = (offset: number, velocity: number) =>
    Math.abs(offset) * velocity;

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center max-w-sm mx-auto"
      onClick={advance}
      role="presentation"
    >
      <div className="relative w-full min-h-[200px] flex items-center justify-center mb-10">
        <AnimatePresence mode={reducedMotion ? "sync" : "wait"} initial={false}>
          <motion.h1
            key={PANELS[panel].id}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, x: 40 }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, x: -40 }
            }
            transition={{ duration: reducedMotion ? 0.2 : 0.35, ease: "easeOut" }}
            drag={reducedMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (reducedMotion) return;
              const swipe = swipePower(info.offset.x, info.velocity.x);
              if (swipe < -swipeConfidence) {
                advance();
              }
            }}
            className="font-heading text-2xl font-medium text-ink cursor-pointer select-none"
          >
            {PANELS[panel].text}
          </motion.h1>
        </AnimatePresence>
      </div>

      <div className="flex gap-2 mb-8" aria-hidden>
        {PANELS.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === panel ? "bg-accent" : "bg-border"
            }`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          advance();
        }}
        disabled={finishing}
        className="px-6 py-3 rounded-full bg-accent text-white font-ui text-sm min-h-[48px] disabled:opacity-40"
      >
        {isLast ? (finishing ? "Starting…" : "Begin") : "Continue"}
      </button>

      <p className="font-ui text-xs text-ink-faint mt-6">Tap or swipe to continue</p>
    </div>
  );
}
