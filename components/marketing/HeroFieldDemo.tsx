"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { LoopCircle } from "@/components/field/LoopCircle";
import {
  computeLoopLayout,
  fieldLabelMaxWidth,
  fieldLayoutCircleSize,
} from "@/lib/loops/layout";

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
    completionText: "Text Tom about Saturday",
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

const CLOSING_LOOP_ID = "demo-tom";
const CLOSING_LOOP = DEMO_LOOPS.find((l) => l.id === CLOSING_LOOP_ID)!;
const RELEASE_CAPTION = "Releasing";
const QUIET_CAPTION = "A quieter head";

type Phase =
  | "transcript"
  | "dissolve"
  | "field"
  | "focus"
  | "tap"
  | "release"
  | "quiet";

function useTypewriter(
  text: string,
  active: boolean,
  speedMs = 42,
  reducedMotion?: boolean | null
) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    if (reducedMotion) {
      setIndex(text.length);
      return;
    }
    if (index >= text.length) return;
    const t = setTimeout(() => setIndex((i) => i + 1), speedMs);
    return () => clearTimeout(t);
  }, [active, index, text, speedMs, reducedMotion]);

  return text.slice(0, index);
}

export function HeroFieldDemo() {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("transcript");
  const [transcriptIndex, setTranscriptIndex] = useState(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [fieldSize, setFieldSize] = useState({ width: 320, height: 400 });

  const releaseCaption = useTypewriter(
    RELEASE_CAPTION,
    phase === "release",
    55,
    reducedMotion
  );
  const quietCaption = useTypewriter(
    QUIET_CAPTION,
    phase === "quiet",
    48,
    reducedMotion
  );
  const actionText = useTypewriter(
    CLOSING_LOOP.completionText ?? CLOSING_LOOP.label,
    phase === "release" || phase === "quiet",
    36,
    reducedMotion
  );

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
      {
        visibleCount: DEMO_LOOPS.length,
        leftInset: 0,
        slotMinWidth: fieldSize.width < 380 ? 92 : 112,
      }
    );
    return new Map(layout.map((p) => [p.id, p]));
  }, [fieldSize]);

  const closingPos = positions.get(CLOSING_LOOP_ID);

  useEffect(() => {
    if (reducedMotion) {
      setPhase("quiet");
      return;
    }

    const cycle = () => {
      setPhase("transcript");
      setTranscriptIndex(0);
    };

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (phase === "transcript") {
      if (transcriptIndex < DEMO_TRANSCRIPT.length) {
        timers.push(setTimeout(() => setTranscriptIndex((i) => i + 1), 18));
      } else {
        timers.push(setTimeout(() => setPhase("dissolve"), 400));
      }
    } else if (phase === "dissolve") {
      timers.push(setTimeout(() => setPhase("field"), 900));
    } else if (phase === "field") {
      timers.push(setTimeout(() => setPhase("focus"), 2200));
    } else if (phase === "focus") {
      timers.push(setTimeout(() => setPhase("tap"), 1100));
    } else if (phase === "tap") {
      timers.push(setTimeout(() => setPhase("release"), 450));
    } else if (phase === "release") {
      timers.push(setTimeout(() => setPhase("quiet"), 2400));
    } else if (phase === "quiet") {
      timers.push(setTimeout(cycle, 3000));
    }

    return () => timers.forEach(clearTimeout);
  }, [phase, transcriptIndex, reducedMotion]);

  const showTranscript = phase === "transcript" || phase === "dissolve";
  const showLoops = phase !== "transcript";
  const closingSequence = phase === "focus" || phase === "tap" || phase === "release" || phase === "quiet";
  const isReleasing = phase === "release";
  const isComplete = phase === "quiet";

  const bottomCaption = (() => {
    if (phase === "transcript") return "Listening…";
    if (phase === "dissolve") return "Finding your loops…";
    if (phase === "field" || phase === "focus" || phase === "tap") return "Occupying you";
    if (phase === "release") {
      return releaseCaption.length < RELEASE_CAPTION.length
        ? releaseCaption
        : `${releaseCaption}…`;
    }
    if (phase === "quiet") return quietCaption;
    return "";
  })();

  const showActionBubble =
    closingSequence && (phase === "release" || phase === "quiet") && actionText.length > 0;

  return (
    <div className="relative w-full h-[500px] sm:h-auto sm:aspect-[4/5] max-w-md mx-auto bg-paper rounded-2xl overflow-hidden border border-border shadow-subtle">
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

        <div ref={fieldRef} className="relative flex-1 w-full min-h-0">
          <AnimatePresence>
            {showLoops && (
              <motion.div
                key="loops"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2 }}
                className="absolute inset-0"
              >
                {DEMO_LOOPS.map((loop, i) => {
                  const pos = positions.get(loop.id);
                  const isClosing = CLOSING_LOOP_ID === loop.id;
                  const centerX = fieldSize.width / 2;
                  const centerY = (fieldSize.height - 28) / 2;
                  const circleSize = Math.min(
                    fieldLayoutCircleSize(loop, fieldSize.width, DEMO_LOOPS.length),
                    fieldSize.width < 380 ? 36 : Number.POSITIVE_INFINITY
                  );
                  const dimmed = closingSequence && !isClosing;

                  return (
                    <div
                      key={loop.id}
                      className="absolute"
                      style={{
                        left: pos?.x ?? centerX,
                        top: pos?.y ?? centerY,
                        transform: "translate(-50%, -50%)",
                        zIndex: isClosing ? 20 : 1,
                      }}
                    >
                      <motion.div
                        className="relative"
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={{
                          opacity: dimmed ? 0.28 : 1,
                          scale:
                            isClosing && phase === "tap"
                              ? 0.94
                              : isClosing && isReleasing
                                ? 1.06
                                : 1,
                          filter: isClosing && isComplete ? "brightness(1.05)" : "none",
                        }}
                        transition={{
                          delay: phase === "field" ? i * 0.15 : 0,
                          duration: isClosing && phase === "tap" ? 0.18 : 0.8,
                          ease: "easeOut",
                        }}
                      >
                        {isClosing && phase === "focus" && (
                          <motion.span
                            className="absolute inset-0 -m-3 rounded-full border-2 border-accent/50 pointer-events-none"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.95, 1.08, 0.95] }}
                            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                            aria-hidden
                          />
                        )}

                        {isClosing && phase === "tap" && (
                          <motion.span
                            className="absolute inset-0 -m-1 rounded-full bg-accent/15 pointer-events-none"
                            initial={{ opacity: 0.6, scale: 1 }}
                            animate={{ opacity: 0, scale: 1.45 }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                            aria-hidden
                          />
                        )}

                        <LoopCircle
                          label={loop.label}
                          state={loop.state}
                          weight={loop.weight}
                          emotionalIntensity={loop.emotionalIntensity}
                          visualSeed={loop.visualSeed}
                          size={circleSize}
                          animateArc={isClosing && (isReleasing || isComplete) ? 1 : undefined}
                          closingMode={
                            isClosing && (isReleasing || isComplete) ? "done" : undefined
                          }
                          drift={
                            (phase === "quiet" || reducedMotion === true) && !isClosing
                          }
                          showLabel
                          labelPosition={pos?.labelPosition ?? "below"}
                          labelOpacity={
                            dimmed ? 0.35 : loop.state === "parked" ? 0.5 : 0.85
                          }
                          labelMaxWidth={fieldLabelMaxWidth(fieldSize.width)}
                          compactLabel={fieldSize.width < 380}
                          visibleCount={DEMO_LOOPS.length}
                          forField
                        />
                      </motion.div>
                    </div>
                  );
                })}

                <AnimatePresence>
                  {showActionBubble && closingPos && (
                    <motion.div
                      key="action-bubble"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.35 }}
                      className="absolute z-30 pointer-events-none"
                      style={{
                        left: closingPos.x,
                        top: Math.max(12, closingPos.y - 56),
                        transform: "translateX(-50%)",
                        maxWidth: fieldSize.width * 0.72,
                      }}
                    >
                      <div className="glass-panel rounded-2xl px-3 py-2 shadow-subtle border border-border/80">
                        <p className="font-ui text-[11px] text-ink-soft text-center leading-snug">
                          {actionText}
                          {phase === "release" &&
                            actionText.length <
                              (CLOSING_LOOP.completionText ?? CLOSING_LOOP.label).length && (
                            <span className="inline-block w-0.5 h-3 bg-accent ml-0.5 animate-pulse align-middle" />
                          )}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isComplete && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: [0, 0.5, 0], scale: [0.6, 1.4, 1.8] }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute pointer-events-none rounded-full border border-closed/40"
                    style={{
                      left: closingPos?.x ?? fieldSize.width / 2,
                      top: closingPos?.y ?? (fieldSize.height - 28) / 2,
                      width: 72,
                      height: 72,
                      transform: "translate(-50%, -50%)",
                      zIndex: 15,
                    }}
                    aria-hidden
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none px-4">
        <span className="font-ui text-xs text-ink-faint tracking-wide">
          {bottomCaption}
          {(phase === "release" && releaseCaption.length < RELEASE_CAPTION.length) ||
          (phase === "quiet" && quietCaption.length < QUIET_CAPTION.length) ? (
            <span className="inline-block w-0.5 h-3 bg-ink-faint/60 ml-0.5 animate-pulse align-middle" />
          ) : null}
        </span>
      </div>
    </div>
  );
}
