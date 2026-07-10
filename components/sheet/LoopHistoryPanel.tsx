"use client";

import { useEffect, useMemo, useState } from "react";
import type { LoopDetailsDTO, LoopDTO, LoopEventDTO } from "@/lib/types/loop";

interface LoopHistoryPanelProps {
  loop: LoopDTO;
  dummyMode?: boolean;
  compact?: boolean;
}

const STATE_LABELS = {
  open_attention: "Open",
  next_step_known: "Next step set",
  parked: "Parked",
  released: "Released",
  done: "Done",
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function describeEvent(event: LoopEventDTO): string {
  if (!event.fromState) return "First noticed";
  if (event.fromState === event.toState) return "Came back to mind";
  if (event.toState === "next_step_known") return "A next step was set";
  return STATE_LABELS[event.toState];
}

function createDummyDetails(loop: LoopDTO): LoopDetailsDTO {
  const evidence =
    loop.mentionCount > 1
      ? `This has returned ${loop.mentionCount} times in your offloads.`
      : null;
  return {
    loop,
    events: [
      {
        id: `${loop.id}-latest`,
        fromState:
          loop.state === "done" || loop.state === "released"
            ? "open_attention"
            : loop.mentionCount > 1 || loop.updatedAt !== loop.createdAt
              ? loop.state
              : null,
        toState: loop.state,
        note: evidence ?? loop.nextStep,
        createdAt: loop.updatedAt,
      },
      ...(loop.updatedAt !== loop.createdAt
        ? [
            {
              id: `${loop.id}-created`,
              fromState: null,
              toState: "open_attention" as const,
              note: null,
              createdAt: loop.createdAt,
            },
          ]
        : []),
    ],
    source: {
      inputMode: "voice",
      createdAt: loop.createdAt,
      transcriptRetained: true,
    },
  };
}

export function LoopHistoryPanel({
  loop,
  dummyMode = false,
  compact = false,
}: LoopHistoryPanelProps) {
  const [details, setDetails] = useState<LoopDetailsDTO | null>(
    dummyMode ? createDummyDetails(loop) : null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dummyMode) {
      setDetails(createDummyDetails(loop));
      setError(null);
      return;
    }

    const controller = new AbortController();
    setDetails(null);
    setError(null);

    fetch(`/api/loops/${loop.id}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load this history.");
        setDetails(data);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Could not load this history.");
      });

    return () => controller.abort();
  }, [dummyMode, loop]);

  const contextNotes = useMemo(() => {
    if (!details) return [];
    const seen = new Set<string>();
    return details.events
      .filter((event) => event.note && event.note !== loop.nextStep)
      .filter((event) => {
        const note = event.note as string;
        if (seen.has(note)) return false;
        seen.add(note);
        return true;
      })
      .slice(0, 3);
  }, [details, loop.nextStep]);

  if (error) {
    return <p className="py-5 text-center font-ui text-sm text-accent" role="alert">{error}</p>;
  }

  if (!details) {
    return (
      <div className="space-y-3 py-5" aria-label="Loading loop history">
        <div className="h-16 animate-pulse rounded-2xl bg-border-soft/60" />
        <div className="h-24 animate-pulse rounded-2xl bg-border-soft/40" />
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-5" : "space-y-6"}>
      <section aria-labelledby={`why-${loop.id}`}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 id={`why-${loop.id}`} className="font-ui text-[11px] uppercase tracking-[2px] text-ink-faint">
            Why this is here
          </h3>
          <span className="font-ui text-xs text-ink-placeholder">
            {loop.mentionCount} mention{loop.mentionCount === 1 ? "" : "s"}
          </span>
        </div>
        {contextNotes.length > 0 ? (
          <div className="mt-3 space-y-2">
            {contextNotes.map((event) => (
              <blockquote
                key={event.id}
                className="rounded-2xl border border-border-soft bg-paper/45 px-4 py-3 font-heading text-[14px] leading-relaxed text-ink-soft"
              >
                &ldquo;{event.note}&rdquo;
              </blockquote>
            ))}
          </div>
        ) : (
          <p className="mt-2 font-ui text-sm leading-relaxed text-ink-muted">
            No additional quote was retained for this loop. Its lifecycle is recorded below.
          </p>
        )}
      </section>

      <section aria-labelledby={`timeline-${loop.id}`}>
        <h3 id={`timeline-${loop.id}`} className="font-ui text-[11px] uppercase tracking-[2px] text-ink-faint">
          History
        </h3>
        <ol className="mt-3 space-y-0">
          {details.events.map((event, index) => (
            <li key={event.id} className="relative grid grid-cols-[14px_1fr] gap-3 pb-4 last:pb-0">
              {index < details.events.length - 1 && (
                <span className="absolute left-[6px] top-3 h-full w-px bg-border" aria-hidden />
              )}
              <span className="relative z-10 mt-1.5 h-3 w-3 rounded-full border-2 border-sheet bg-accent-soft" aria-hidden />
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-ui text-sm text-ink-soft">{describeEvent(event)}</p>
                  <time className="shrink-0 font-ui text-[11px] text-ink-placeholder" dateTime={event.createdAt}>
                    {formatDate(event.createdAt)}
                  </time>
                </div>
                {event.note && (
                  <p className="mt-1 font-ui text-xs leading-relaxed text-ink-muted">{event.note}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {details.source && (
        <p className="quiet-divider pt-4 font-ui text-xs leading-relaxed text-ink-placeholder">
          First noticed in a {details.source.inputMode} offload on {formatDate(details.source.createdAt)}.
          {details.source.transcriptRetained
            ? " The original offload is saved in your private data."
            : " The original offload was not retained."}
        </p>
      )}
    </div>
  );
}
