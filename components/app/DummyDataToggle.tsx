"use client";

import { useDummyData } from "@/components/providers/DummyDataProvider";

export function DummyDataToggle() {
  const { enabled, available, setEnabled } = useDummyData();

  if (!available) return null;

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span className="font-ui text-xs text-ink-faint whitespace-nowrap">Dummy data</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle dummy data for visual testing"
        onClick={() => setEnabled(!enabled)}
        className={`relative w-10 h-[22px] rounded-full transition-colors min-w-[40px] ${
          enabled ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-subtle transition-transform ${
            enabled ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
