"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { LoopCircle } from "@/components/field/LoopCircle";

const CLOSING_LINES = [
  "It's no longer all swirling around together.",
  "They have somewhere to be now.",
  "Each one has its own place.",
];

interface SessionSummaryProps {
  stats: {
    new: number;
    matched: number;
    openAttention: number;
    nextStepKnown: number;
    parked: number;
    total: number;
  };
  onDismiss: () => void;
}

export function SessionSummary({ stats, onDismiss }: SessionSummaryProps) {
  const totalMentioned = stats.new + stats.matched;
  const closingLine = CLOSING_LINES[totalMentioned % CLOSING_LINES.length];

  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const summaryParts: string[] = [];
  if (stats.openAttention > 0) summaryParts.push(`${stats.openAttention} need you`);
  if (stats.nextStepKnown > 0) summaryParts.push(`${stats.nextStepKnown} have a next step`);
  if (stats.parked > 0) summaryParts.push(`${stats.parked} parked`);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-paper flex flex-col items-center justify-center px-8"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-6 right-6 font-ui text-sm text-ink-faint min-h-[48px] min-w-[48px]"
      >
        Skip
      </button>

      <h2 className="font-heading text-[22px] font-medium text-ink mb-8">A quieter head</h2>

      <p className="font-ui text-sm text-ink-muted text-center mb-8 max-w-xs leading-relaxed">
        {totalMentioned > 0
          ? `${totalMentioned} things were swirling. ${summaryParts.join(", ")}.`
          : "Sounds like a clear head. Nothing to hold."}
      </p>

      <div className="flex gap-6 mb-10">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[2.5px] text-ink-faint mb-2">Before</p>
          <div className="relative w-32 h-28">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute"
                style={{ left: i * 14, top: (i % 3) * 18 }}
              >
                <LoopCircle
                  state="open_attention"
                  weight={3}
                  visualSeed={i * 11}
                  size={40 + (i % 3) * 8}
                  showLabel={false}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[2.5px] text-ink-faint mb-2">After</p>
          <div className="relative w-36 h-32">
            <div className="absolute left-4 top-2">
              <LoopCircle state="open_attention" weight={4} visualSeed={1} size={56} showLabel={false} />
            </div>
            <div className="absolute right-2 top-6">
              <LoopCircle state="next_step_known" weight={3} visualSeed={2} size={48} showLabel={false} />
            </div>
            <div className="absolute left-8 bottom-0">
              <LoopCircle state="parked" weight={2} visualSeed={3} size={36} showLabel={false} />
            </div>
          </div>
        </div>
      </div>

      <p className="font-heading italic text-[17px] text-ink-soft text-center leading-relaxed max-w-sm">
        {closingLine}
      </p>
    </motion.div>
  );
}
