"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

interface ClearHeadInterstitialProps {
  onDismiss: () => void;
}

export function ClearHeadInterstitial({ onDismiss }: ClearHeadInterstitialProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-paper flex flex-col items-center justify-center px-8"
      onClick={onDismiss}
      role="dialog"
      aria-label="Clear head"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-6 right-6 font-ui text-sm text-ink-faint min-h-[48px] min-w-[48px]"
      >
        Dismiss
      </button>

      <p className="font-heading text-[22px] font-medium text-ink text-center leading-relaxed max-w-xs">
        Sounds like a clear head. Nothing to hold.
      </p>
    </motion.div>
  );
}
