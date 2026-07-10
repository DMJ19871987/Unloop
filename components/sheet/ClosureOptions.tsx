"use client";

import { useState } from "react";
import type { ClosureAction } from "@/lib/types/loop";

const OPTIONS: { action: ClosureAction; label: string }[] = [
  { action: "done", label: "I've done it" },
  { action: "next_step_known", label: "I know the next step" },
  { action: "parked", label: "Revisit later" },
  { action: "released", label: "It no longer matters" },
  { action: "still_on_mind", label: "Still on my mind" },
];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

interface ClosureOptionsProps {
  onSelect: (action: ClosureAction) => void;
  onPark: (resurfaceAfter?: string) => void;
  disabled?: boolean;
}

export function ClosureOptions({ onSelect, onPark, disabled }: ClosureOptionsProps) {
  const [showHorizon, setShowHorizon] = useState(false);

  const handleOptionClick = (action: ClosureAction) => {
    if (action === "parked") {
      setShowHorizon(true);
      return;
    }
    onSelect(action);
  };

  if (showHorizon) {
    return (
      <div className="space-y-3 max-w-sm mx-auto">
        <p className="font-ui text-sm text-ink-muted text-center">When to revisit</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPark(addDays(7))}
            className="px-4 py-2.5 rounded-full border border-border bg-white font-ui text-sm text-ink-soft hover:border-accent hover:bg-accent-tint min-h-[48px] disabled:opacity-50"
          >
            next week
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPark(addDays(30))}
            className="px-4 py-2.5 rounded-full border border-border bg-white font-ui text-sm text-ink-soft hover:border-accent hover:bg-accent-tint min-h-[48px] disabled:opacity-50"
          >
            next month
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPark()}
            className="px-4 py-2.5 rounded-full border border-border bg-white font-ui text-sm text-ink-soft hover:border-accent hover:bg-accent-tint min-h-[48px] disabled:opacity-50"
          >
            someday
          </button>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPark()}
          className="w-full py-2.5 font-ui text-sm text-ink-faint hover:text-ink-soft min-h-[48px] disabled:opacity-50"
        >
          just set it down
        </button>
        <button
          type="button"
          onClick={() => setShowHorizon(false)}
          className="w-full py-2 font-ui text-xs text-ink-faint min-h-[48px]"
        >
          back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2.5 justify-center">
      {OPTIONS.map((opt) => (
        <button
          key={opt.action}
          type="button"
          disabled={disabled}
          onClick={() => handleOptionClick(opt.action)}
          className="px-[17px] py-[11px] rounded-full border border-border bg-white font-ui text-sm text-ink-soft hover:border-accent hover:bg-accent-tint min-h-[48px] disabled:opacity-50 transition-colors"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
