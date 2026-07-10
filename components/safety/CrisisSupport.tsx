"use client";

import { CRISIS_ACK_COPY, CRISIS_RESOURCES } from "@/lib/safety/crisis-resources";

interface CrisisSupportProps {
  onContinue: () => void;
}

export function CrisisSupport({ onContinue }: CrisisSupportProps) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="crisis-support-ack"
      className="min-h-[85vh] flex flex-col items-center justify-center px-8 py-12"
    >
      <div className="max-w-sm w-full text-center space-y-6">
        <p
          id="crisis-support-ack"
          className="font-ui text-sm text-ink-muted leading-relaxed"
        >
          {CRISIS_ACK_COPY}
        </p>

        <ul className="space-y-4 text-left pt-2">
          {CRISIS_RESOURCES.lines.map((line) => (
            <li
              key={line.name}
              className="bg-sheet border border-border rounded-2xl px-5 py-4"
            >
              <p className="font-ui text-sm font-medium text-ink">{line.name}</p>
              <p className="font-ui text-sm text-ink-soft mt-1">{line.contact}</p>
              <p className="font-ui text-xs text-ink-faint mt-1">{line.note}</p>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onContinue}
          className="font-ui text-sm text-ink-faint hover:text-accent-selected transition-colors min-h-[48px] pt-4"
        >
          Continue to your field
        </button>
      </div>
    </div>
  );
}
