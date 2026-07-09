"use client";

import { useState } from "react";

interface NextStepInputProps {
  onSave: (nextStep: string) => void;
  onCancel: () => void;
}

export function NextStepInput({ onSave, onCancel }: NextStepInputProps) {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-3 max-w-sm mx-auto">
      <p className="font-ui text-xs text-ink-placeholder tracking-wide">
        What&apos;s the next step?
      </p>
      <div className="flex items-center gap-3 bg-[#F6EFE6] border border-border-soft rounded-2xl px-4 py-3.5">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Draft the cover letter…"
          className="flex-1 bg-transparent font-ui text-[15px] text-ink placeholder:text-ink-placeholder focus:outline-none"
          autoFocus
        />
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-selected)"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="shrink-0 opacity-60"
          aria-hidden
        >
          <rect x="9" y="2.5" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
          <line x1="12" y1="17.5" x2="12" y2="21" />
        </svg>
      </div>
      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-full border border-border font-ui text-sm min-h-[48px]"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!value.trim()}
          onClick={() => onSave(value.trim())}
          className="px-4 py-2 rounded-full bg-accent text-white font-ui text-sm min-h-[48px] disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
