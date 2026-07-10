"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { LoopCircle } from "@/components/field/LoopCircle";
import { LoopHistoryPanel } from "@/components/sheet/LoopHistoryPanel";
import { WeeklySummaryCard } from "./WeeklySummaryCard";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
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
  dummyMode?: boolean;
}

type RecordFilter = "all" | "done" | "released";

function formatClosedDate(iso: string | null): string {
  if (!iso) return "Date unavailable";
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
  dummyMode = false,
}: RecordViewProps) {
  const [selected, setSelected] = useState<ClosedLoopDTO | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RecordFilter>("all");
  const dialogRef = useFocusTrap(Boolean(selected));

  const fieldLoops = useMemo(() => closedLoops.slice(0, 12), [closedLoops]);
  const positions = useMemo(
    () =>
      fieldLoops.map((_, index) => {
        if (fieldLoops.length === 1) return { x: 170, y: 155 };
        const angle = (index / fieldLoops.length) * Math.PI * 2 - Math.PI / 2;
        const radius = fieldLoops.length > 9 ? 108 : 96;
        return {
          x: 170 + Math.cos(angle) * radius,
          y: 155 + Math.sin(angle) * radius,
        };
      }),
    [fieldLoops]
  );

  const filteredLoops = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    return closedLoops.filter((loop) => {
      const matchesFilter = filter === "all" || loop.state === filter;
      const matchesQuery =
        !normalisedQuery ||
        loop.label.toLowerCase().includes(normalisedQuery) ||
        loop.category.toLowerCase().includes(normalisedQuery) ||
        loop.nextStep?.toLowerCase().includes(normalisedQuery);
      return matchesFilter && Boolean(matchesQuery);
    });
  }, [closedLoops, filter, query]);

  return (
    <div className="min-h-[85vh] overflow-hidden pb-16">
      <header className="relative flex items-start justify-between gap-4 px-6 pb-6 pt-6 sm:px-8">
        <div className="animate-float-in">
          <p className="mb-1 font-ui text-[10px] uppercase tracking-[2.6px] text-ink-placeholder">
            Your record
          </p>
          <h1 className="font-heading text-[26px] font-medium text-ink">Released</h1>
          <p className="mt-1 font-ui text-[12.5px] text-ink-faint">{counter}</p>
        </div>
        <Link
          href="/field"
          onClick={() => track("field_toggle_used", { to: "field" })}
          className="inline-flex min-h-[48px] items-center rounded-full border border-border/80 bg-sheet/72 px-3 py-1.5 font-ui text-xs text-ink-faint shadow-subtle backdrop-blur transition hover:border-accent/40"
        >
          <span>Occupying you</span>
          <span className="mx-1.5">/</span>
          <span className="font-medium text-accent-selected">Released</span>
        </Link>
      </header>

      <main className="px-6">
        {closedLoops.length === 0 ? (
          <div className="glass-panel mx-auto max-w-sm rounded-[28px] px-6 py-16 text-center">
            <p className="font-heading text-base italic text-ink-muted">
              Nothing released yet. When you close a loop, it will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="field-surface relative mx-auto h-[310px] w-full max-w-[340px] rounded-full">
              {fieldLoops.map((loop, index) => (
                <button
                  key={loop.id}
                  type="button"
                  onClick={() => setSelected(loop)}
                  className="absolute transition hover:scale-105 focus:outline-none"
                  style={{
                    left: positions[index].x,
                    top: positions[index].y,
                    transform: "translate(-50%, -50%)",
                  }}
                  aria-label={`Explore ${loop.label}`}
                >
                  <LoopCircle
                    label=""
                    state={loop.state}
                    weight={loop.weight}
                    emotionalIntensity={loop.emotionalIntensity}
                    visualSeed={loop.visualSeed}
                    size={44 + Math.min(loop.weight, 5) * 2}
                    arc={1}
                    showLabel={false}
                    stroke={loop.state === "done" ? "var(--accent)" : "var(--closed)"}
                  />
                </button>
              ))}
            </div>

            <section className="mx-auto mt-10 max-w-md" aria-labelledby="archive-title">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="font-ui text-[10px] uppercase tracking-[2.2px] text-ink-placeholder">
                    Explore
                  </p>
                  <h2 id="archive-title" className="mt-1 font-heading text-xl text-ink">
                    Loop history
                  </h2>
                </div>
                <span className="font-ui text-xs text-ink-faint">
                  {filteredLoops.length} shown
                </span>
              </div>

              <label htmlFor="record-search" className="sr-only">Search your loop history</label>
              <input
                id="record-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search released loops"
                className="min-h-[48px] w-full rounded-2xl border border-border bg-sheet/70 px-4 font-ui text-sm text-ink shadow-[var(--shadow-inset)] outline-none transition placeholder:text-ink-placeholder focus:border-accent"
              />

              <div className="mt-3 grid grid-cols-3 rounded-full border border-border bg-paper/45 p-1 font-ui text-xs">
                {(["all", "done", "released"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    className={`min-h-[40px] rounded-full px-3 capitalize transition ${
                      filter === option ? "bg-sheet text-ink shadow-subtle" : "text-ink-faint"
                    }`}
                    aria-pressed={filter === option}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="mt-4 divide-y divide-border-soft border-y border-border-soft">
                {filteredLoops.map((loop) => (
                  <button
                    key={loop.id}
                    type="button"
                    onClick={() => setSelected(loop)}
                    className="grid min-h-[72px] w-full grid-cols-[1fr_auto] items-center gap-4 py-3 text-left transition hover:pl-1"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-heading text-[15px] text-ink-soft">
                        {loop.label}
                      </span>
                      <span className="mt-1 block font-ui text-xs capitalize text-ink-faint">
                        {loop.category} · {loop.mentionCount} mention{loop.mentionCount === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="text-right font-ui text-[11px] text-ink-placeholder">
                      {formatClosedDate(loop.closedAt)}
                    </span>
                  </button>
                ))}
                {filteredLoops.length === 0 && (
                  <p className="py-10 text-center font-ui text-sm text-ink-faint">
                    No loops match that search.
                  </p>
                )}
              </div>
            </section>
          </>
        )}

        {weeklySummaries.length > 0 && (
          <section className="mx-auto mt-12 max-w-md space-y-4" aria-labelledby="reflections-title">
            <h2 id="reflections-title" className="text-center font-ui text-[11px] uppercase tracking-[2.5px] text-ink-faint">
              Weekly reflections
            </h2>
            {weeklySummaries.map((summary) => (
              <WeeklySummaryCard key={summary.id} summary={summary} />
            ))}
          </section>
        )}
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-ink/10 backdrop-blur-[3px]"
            onClick={() => setSelected(null)}
            aria-label="Close loop history"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-loop-title"
            className="glass-panel relative max-h-[88vh] w-full max-w-md animate-float-in overflow-y-auto rounded-t-[28px] p-6 pb-10 shadow-float sm:rounded-[28px]"
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-4 top-3 min-h-[44px] px-2 font-ui text-xs text-ink-faint hover:text-ink"
            >
              Close
            </button>
            <div className="pr-12">
              <p className="font-ui text-[10px] uppercase tracking-[2px] text-ink-placeholder">
                {selected.state === "done" ? "Done" : "Released"} {formatClosedDate(selected.closedAt)}
              </p>
              <h3 id="record-loop-title" className="mt-1 font-heading text-2xl text-ink">
                {selected.label}
              </h3>
            </div>
            {selected.nextStep && (
              <div className="mt-5 rounded-2xl border border-border-soft bg-paper/45 px-4 py-3">
                <p className="font-ui text-[10px] uppercase tracking-[1.8px] text-ink-placeholder">Last next step</p>
                <p className="mt-1 font-heading text-[15px] text-ink-soft">{selected.nextStep}</p>
              </div>
            )}
            <div className="mt-6">
              <LoopHistoryPanel loop={selected} dummyMode={dummyMode} compact />
            </div>
            <button
              type="button"
              onClick={() => {
                onReopen(selected.id);
                setSelected(null);
              }}
              className="mt-7 min-h-[48px] w-full rounded-full border border-accent/30 font-ui text-sm text-accent-selected transition hover:bg-accent-tint hover:text-accent-hover"
            >
              Bring this back to the field
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
