"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { LoopCircle } from "@/components/field/LoopCircle";
import { computeLoopLayout } from "@/lib/loops/layout";

const DEMO_TRANSCRIPT =
  "I keep thinking about the job application and whether I should message Tom about Saturday. The garden needs sorting. I need to call the bank about that charge. Mum's birthday is coming up and I haven't planned anything.";

const DEMO_LOOPS = [
  {
    id: "demo-job",
    label: "Job application",
    state: "open_attention" as const,
    weight: 5,
    emotionalIntensity: 4,
    visualSeed: 101,
  },
  {
    id: "demo-tom",
    label: "Message Tom",
    state: "open_attention" as const,
    weight: 4,
    emotionalIntensity: 3,
    visualSeed: 202,
  },
  {
    id: "demo-garden",
    label: "The garden",
    state: "open_attention" as const,
    weight: 3,
    emotionalIntensity: 2,
    visualSeed: 303,
  },
  {
    id: "demo-bank",
    label: "Call the bank",
    state: "next_step_known" as const,
    weight: 3,
    emotionalIntensity: 2,
    visualSeed: 404,
  },
  {
    id: "demo-mum",
    label: "Mum's birthday",
    state: "open_attention" as const,
    weight: 4,
    emotionalIntensity: 3,
    visualSeed: 505,
  },
  {
    id: "demo-sam",
    label: "Reply to Sam",
    state: "parked" as const,
    weight: 2,
    emotionalIntensity: 1,
    visualSeed: 606,
  },
];

const CLOSING_LOOP_ID = "demo-sam";

type Phase = "transcript" | "dissolve" | "field" | "close" | "drift";

export function HeroFieldDemo() {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("transcript");
  const [transcriptIndex, setTranscriptIndex] = useState(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [fieldSize, setFieldSize] = useState({ width: 320, height: 400 });

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setFieldSize({
        width: Math.max(280, Math.round(rect.width)),
        height: Math.max(340, Math.round(rect.height)),
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const positions = useMemo(() => {
    const layout = computeLoopLayout(
      DEMO_LOOPS.map((loop) => ({
        id: loop.id,
        state: loop.state,
        weight: loop.weight,
        emotionalIntensity: loop.emotionalIntensity,
        label: loop.label,
        visualSeed: loop.visualSeed,
      })),
      fieldSize.width,
      fieldSize.height - 28,
      { visibleCount: DEMO_LOOPS.length }
    );
    return new Map(layout.map((p) => [p.id, p]));
  }, [fieldSize]);

  useEffect(() => {
    if (reducedMotion) {
      setPhase("drift");
      return;
    }

    const cycle = () => {
      setPhase("transcript");
      setTranscriptIndex(0);
    };

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (phase === "transcript") {
      if (transcriptIndex < DEMO_TRANSCRIPT.length) {
        const t = setTimeout(() => setTranscriptIndex((i) => i + 1), 28);
        timers.push(t);
      } else {
        timers.push(setTimeout(() => setPhase("dissolve"), 800));
      }
    } else if (phase === "dissolve") {
      timers.push(setTimeout(() => setPhase("field"), 1200));
    } else if (phase === "field") {
      timers.push(setTimeout(() => setPhase("close"), 2500));
    } else if (phase === "close") {
      timers.push(setTimeout(() => setPhase("drift"), 2000));
    } else if (phase === "drift") {
      timers.push(setTimeout(cycle, 4000));
    }

    return () => timers.forEach(clearTimeout);
  }, [phase, transcriptIndex, reducedMotion]);

  const showTranscript = phase === "transcript" || phase === "dissolve";
  const showLoops = phase !== "transcript";

  return (
    <div className="relative w-full aspect-[4/5] max-w-md mx-auto bg-paper rounded-2xl overflow-hidden border border-border shadow-subtle">
      <div className="absolute inset-0 p-6 flex flex-col">
        <AnimatePresence mode="wait">
          {showTranscript && (
            <motion.div
              key="transcript"
              initial={{ opacity: 1 }}
              animate={{ opacity: phase === "dissolve" ? 0 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-6 flex items-center justify-center"
            >
              <p className="font-ui text-sm leading-relaxed text-ink-muted text-center">
                {reducedMotion
                  ? DEMO_TRANSCRIPT
                  : DEMO_TRANSCRIPT.slice(0, transcriptIndex)}
                {!reducedMotion && transcriptIndex < DEMO_TRANSCRIPT.length && (
                  <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse" />
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {showLoops && (
          <motion.div
            ref={fieldRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="relative flex-1 w-full min-h-0"
          >
            {DEMO_LOOPS.map((loop, i) => {
              const pos = positions.get(loop.id);
              const isClosing = CLOSING_LOOP_ID === loop.id;
              const centerX = fieldSize.width / 2;
              const centerY = (fieldSize.height - 28) / 2;

              return (
                <motion.div
                  key={loop.id}
                  className="absolute"
                  style={{
                    left: pos?.x ?? centerX,
                    top: pos?.y ?? centerY,
                    transform: "translate(-50%, -50%)",
                  }}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{
                    opacity: isClosing && phase === "close" ? 0.3 : 1,
                    scale: 1,
                  }}
                  transition={{
                    delay: i * 0.15,
                    duration: 0.8,
                    ease: "easeOut",
                  }}
                >
                  <LoopCircle
                    label={loop.label}
                    state={loop.state}
                    weight={loop.weight}
                    emotionalIntensity={loop.emotionalIntensity}
                    visualSeed={loop.visualSeed}
                    animateArc={isClosing && phase === "close" ? 1 : undefined}
                    drift={phase === "drift" || reducedMotion === true}
                    showLabel
                    labelPosition={pos?.labelPosition ?? "below"}
                    labelOpacity={loop.state === "parked" ? 0.5 : 0.85}
                    visibleCount={DEMO_LOOPS.length}
                    forField
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
        <span className="font-ui text-xs text-ink-faint tracking-wide">
          {phase === "transcript" && "Listening…"}
          {phase === "dissolve" && "Finding your loops…"}
          {phase === "field" && "Occupying you"}
          {phase === "close" && "Releasing…"}
          {phase === "drift" && "A quieter head"}
        </span>
      </div>
    </div>
  );
}
