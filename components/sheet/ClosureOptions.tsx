"use client";

import type { ClosureAction } from "@/lib/types/loop";

const OPTIONS: { action: ClosureAction; label: string }[] = [
  { action: "done", label: "I've done it" },
  { action: "next_step_known", label: "I know the next step" },
  { action: "parked", label: "Revisit later" },
  { action: "released", label: "It no longer matters" },
  { action: "still_on_mind", label: "Still on my mind" },
];

interface ClosureOptionsProps {
  onSelect: (action: ClosureAction) => void;
  disabled?: boolean;
  showHorizon?: boolean;
}

export function ClosureOptions({ onSelect, disabled }: ClosureOptionsProps) {
  return (
    <div className="flex flex-wrap gap-2.5 justify-center">
      {OPTIONS.map((opt) => (
        <button
          key={opt.action}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(opt.action)}
          className="px-[17px] py-[11px] rounded-full border border-border bg-white font-ui text-sm text-ink-soft hover:border-accent hover:bg-accent-tint min-h-[48px] disabled:opacity-50 transition-colors"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
