"use client";

import { useState } from "react";
import { LoopCircle } from "@/components/field/LoopCircle";
import { track } from "@/lib/analytics";

export type SessionOutcome = "yes" | "somewhat" | "not_yet" | "skip";

interface SessionLoopMark {
  id: string;
  state: string;
  weight: number;
  visualSeed: number;
  kind: "new" | "matched";
}

interface SessionSummaryProps {
  sessionId?: string;
  stats: {
    new: number;
    matched: number;
    openAttention: number;
    nextStepKnown: number;
    parked: number;
    total: number;
  };
  sessionLoops?: SessionLoopMark[];
  onDismiss: () => void;
}

const OUTCOMES: { value: SessionOutcome; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "somewhat", label: "Somewhat" },
  { value: "not_yet", label: "Not yet" },
  { value: "skip", label: "Skip" },
];

export function SessionSummary({
  sessionId,
  stats,
  sessionLoops = [],
  onDismiss,
}: SessionSummaryProps) {
  const [outcomeStep, setOutcomeStep] = useState(false);
  const totalMentioned = stats.new + stats.matched;

  const summaryParts: string[] = [];
  if (stats.new > 0) summaryParts.push(`${stats.new} new`);
  if (stats.matched > 0) summaryParts.push(`${stats.matched} matched`);

  async function recordOutcome(outcome: SessionOutcome) {
    if (sessionId && outcome !== "skip") {
      try {
        await fetch(`/api/sessions/${sessionId}/outcome`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outcome }),
        });
        track("session_outcome_recorded", { outcome });
      } catch {
        // Non-blocking
      }
    }
    onDismiss();
  }

  if (!outcomeStep) {
    return (
      <div className="fixed inset-0 z-50 bg-paper flex flex-col items-center justify-center px-8">
        <button
          type="button"
          onClick={() => setOutcomeStep(true)}
          className="absolute top-6 right-6 font-ui text-sm text-ink-faint min-h-[48px] min-w-[48px]"
        >
          Skip
        </button>

        <h2 className="font-heading text-[22px] font-medium text-ink mb-6">This session</h2>

        {totalMentioned > 0 ? (
          <>
            <p className="font-ui text-sm text-ink-muted text-center mb-6 max-w-xs leading-relaxed">
              {summaryParts.join(", ")} from what you shared.
            </p>
            {sessionLoops.length > 0 && (
              <div className="flex flex-wrap justify-center gap-4 mb-8 max-w-sm">
                {sessionLoops.map((loop) => (
                  <div key={loop.id} className="text-center">
                    <LoopCircle
                      state={loop.state as "open_attention"}
                      weight={loop.weight}
                      visualSeed={loop.visualSeed}
                      size={44}
                      showLabel={false}
                    />
                    <p className="font-ui text-[10px] text-ink-faint mt-1">
                      {loop.kind === "new" ? "New" : "Matched"}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <p className="font-ui text-xs text-ink-faint text-center max-w-xs">
              {stats.openAttention > 0 && `${stats.openAttention} need you. `}
              {stats.nextStepKnown > 0 && `${stats.nextStepKnown} have a next step. `}
              {stats.parked > 0 && `${stats.parked} parked.`}
            </p>
          </>
        ) : (
          <p className="font-ui text-sm text-ink-muted text-center max-w-xs">
            Sounds like a clear head. Nothing new to hold from this session.
          </p>
        )}

        <button
          type="button"
          onClick={() => setOutcomeStep(true)}
          className="mt-10 px-6 py-3 rounded-full bg-accent text-white font-ui text-sm min-h-[48px]"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col items-center justify-center px-8">
      <h2 className="font-heading text-[20px] font-medium text-ink mb-3 text-center">
        Does your head feel quieter?
      </h2>
      <p className="font-ui text-xs text-ink-faint mb-8">Optional — helps us improve</p>
      <div className="flex flex-wrap justify-center gap-3 max-w-xs">
        {OUTCOMES.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => recordOutcome(o.value)}
            className="min-h-[48px] px-5 py-2 rounded-full border border-border font-ui text-sm text-ink-soft hover:border-accent"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
