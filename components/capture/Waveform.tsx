"use client";

import { motion } from "framer-motion";

const BAR_COUNT = 11;

interface WaveformProps {
  levels: number[];
  active?: boolean;
  gathering?: boolean;
}

export function Waveform({ levels, active = false, gathering = false }: WaveformProps) {
  const displayLevels =
    levels.length === BAR_COUNT
      ? levels
      : Array.from({ length: BAR_COUNT }, () => 0.25);

  const centerIndex = (BAR_COUNT - 1) / 2;

  return (
    <div className="flex items-end justify-center gap-[5px] h-9 w-full max-w-[120px] relative">
      {displayLevels.map((level, i) => {
        const offsetFromCenter = i - centerIndex;
        return (
          <motion.div
            key={i}
            className="w-1 rounded-full origin-bottom"
            initial={false}
            animate={
              gathering
                ? {
                    x: -offsetFromCenter * 9,
                    scaleY: 0.35,
                    opacity: i === Math.round(centerIndex) ? 1 : 0,
                  }
                : {
                    x: 0,
                    scaleY: active ? level : 0.35,
                    opacity: 1,
                  }
            }
            transition={
              gathering
                ? { duration: 0.6, ease: "easeInOut" }
                : { duration: 0.1 }
            }
            style={{
              height: "100%",
              background:
                active && level > 0.6
                  ? "var(--accent)"
                  : active
                    ? "#D8B7A5"
                    : "#E0C7B7",
            }}
          />
        );
      })}
    </div>
  );
}
