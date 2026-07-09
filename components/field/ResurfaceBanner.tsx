"use client";

import type { LoopDTO } from "@/lib/types/loop";

interface ResurfaceBannerProps {
  count: number;
  onTap: () => void;
  onDismiss: () => void;
}

export function ResurfaceBanner({ count, onTap, onDismiss }: ResurfaceBannerProps) {
  return (
    <div className="mx-6 mb-4 bg-sheet border border-border rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onTap}
        className="flex-1 text-left font-ui text-sm text-ink-soft min-h-[48px] flex items-center"
      >
        {count} parked loop{count === 1 ? "" : "s"} {count === 1 ? "is" : "are"} asking if{" "}
        {count === 1 ? "it's" : "they're"} still parked.
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="font-ui text-xs text-ink-faint hover:text-ink-soft min-h-[48px] px-2"
        aria-label="Dismiss"
      >
        Later
      </button>
    </div>
  );
}

export interface ResurfaceFlowProps {
  loops: LoopDTO[];
  onComplete: () => void;
}
