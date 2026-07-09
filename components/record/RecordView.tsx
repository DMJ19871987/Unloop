"use client";

import { useState } from "react";
import Link from "next/link";
import { LoopCircle } from "@/components/field/LoopCircle";
import { WeeklySummaryCard } from "./WeeklySummaryCard";
import type { LoopDTO } from "@/lib/types/loop";

interface WeeklySummaryDTO {
  id: string;
  weekStart: string;
  summaryText: string;
  stats: Record<string, unknown>;
  createdAt?: string;
}

interface ClosedLoopDTO extends LoopDTO {
  size?: number;
}

interface RecordViewProps {
  closedLoops: ClosedLoopDTO[];
  counter: string;
  weeklySummaries: WeeklySummaryDTO[];
  onReopen: (id: string) => void;
}

function formatClosedDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function RecordView({
  closedLoops,
  counter,
  weeklySummaries,
  onReopen,
}: RecordViewProps) {
  const [selected, setSelected] = useState<ClosedLoopDTO | null>(null);

  const positions = closedLoops.map((_, i) => {
    const angle = (i / Math.max(closedLoops.length, 1)) * Math.PI * 2;
    const r = 40 + (i % 3) * 18;
    return {
      x: 150 + Math.cos(angle) * r,
      y: 140 + Math.sin(angle) * r,
    };
  });

  return (
    <div className="min-h-[85vh] flex flex-col pb-16">
      <header className="px-7 pt-4 pb-6 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-[21px] font-medium text-ink">Released</h1>
          <p className="font-ui text-[12.5px] text-ink-faint mt-1">{counter}</p>
        </div>
        <Link
          href="/field"
          className="inline-flex rounded-full border border-border px-3 py-1.5 font-ui text-xs text-ink-faint min-h-[36px] items-center"
        >
          <span>Occupying you</span>
          <span className="mx-1.5">/</span>
          <span className="text-accent-selected font-medium">Released</span>
        </Link>
      </header>

      <div className="px-6 flex-1">
        {closedLoops.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-heading italic text-ink-muted text-base">
              Nothing released yet. When you close a loop, it will appear here.
            </p>
          </div>
        ) : (
          <div className="relative w-full max-w-[300px] h-[280px] mx-auto">
            {closedLoops.map((loop, i) => (
              <button
                key={loop.id}
                type="button"
                onClick={() => setSelected(loop)}
                className="absolute focus:outline-none"
                style={{
                  left: positions[i].x,
                  top: positions[i].y,
                  transform: "translate(-50%, -50%)",
                }}
                aria-label={loop.label}
              >
                <LoopCircle
                  label=""
                  state={loop.state}
                  weight={loop.weight}
                  emotionalIntensity={loop.emotionalIntensity}
                  visualSeed={loop.visualSeed}
                  size={loop.size ?? 56}
                  arc={1}
                  showLabel={false}
                  stroke={loop.state === "done" ? "var(--accent)" : "var(--closed)"}
                />
              </button>
            ))}
          </div>
        )}

        {weeklySummaries.length > 0 && (
          <div className="mt-12 space-y-4 max-w-md mx-auto">
            <h2 className="font-ui text-[11px] uppercase tracking-[2.5px] text-[#B4A79A] text-center">
              Weekly reflections
            </h2>
            {weeklySummaries.map((summary) => (
              <WeeklySummaryCard key={summary.id} summary={summary} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-paper/70" onClick={() => setSelected(null)} />
          <div className="relative bg-sheet border border-border rounded-2xl p-6 max-w-sm w-full shadow-subtle">
            <h3 className="font-heading text-xl text-ink text-center">{selected.label}</h3>
            <p className="font-ui text-sm text-ink-faint text-center mt-2">
              {selected.state === "done" ? "Done" : "Released"} ·{" "}
              {formatClosedDate(selected.closedAt)}
            </p>
            {selected.nextStep && (
              <p className="font-ui text-sm text-ink-muted text-center mt-3">
                Next step was: {selected.nextStep}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                onReopen(selected.id);
                setSelected(null);
              }}
              className="mt-6 w-full font-ui text-sm text-accent-selected hover:text-accent-hover min-h-[48px]"
            >
              Reopen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
