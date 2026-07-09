"use client";

import { motion } from "framer-motion";

interface RecordButtonProps {
  isRecording: boolean;
  onTap: () => void;
}

export function RecordButton({ isRecording, onTap }: RecordButtonProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
      className="relative w-[216px] h-[216px] flex items-center justify-center focus:outline-none"
    >
      {isRecording && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border-[1.5px] border-accent"
            animate={{ scale: [0.86, 1.35], opacity: [0.35, 0] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-[6px] rounded-full border border-[#E3CFC2]"
            animate={{ scale: [0.86, 1.35], opacity: [0.35, 0] }}
            transition={{
              duration: 3.6,
              repeat: Infinity,
              ease: "easeOut",
              delay: 1.2,
            }}
          />
        </>
      )}
      <motion.div
        className="absolute inset-[22px] rounded-full bg-accent-breathe"
        animate={{ scale: isRecording ? [1, 1.05, 1] : [1, 1.04, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative w-[148px] h-[148px] rounded-full bg-accent-button flex items-center justify-center shadow-[inset_0_1px_3px_rgba(255,255,255,0.6)]">
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-selected)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="9" y="2.5" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
          <line x1="12" y1="17.5" x2="12" y2="21" />
        </svg>
      </div>
    </button>
  );
}
