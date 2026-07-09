"use client";

interface WeeklySummaryCardProps {
  summary: {
    id: string;
    weekStart: string;
    summaryText: string;
  };
}

export function WeeklySummaryCard({ summary }: WeeklySummaryCardProps) {
  const weekLabel = new Date(summary.weekStart).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });

  return (
    <div className="bg-sheet border border-border rounded-2xl px-5 py-4">
      <p className="font-ui text-[11px] uppercase tracking-[2px] text-ink-faint mb-2">
        Week of {weekLabel}
      </p>
      <p className="font-heading text-[15px] text-ink-soft leading-relaxed">
        {summary.summaryText}
      </p>
    </div>
  );
}
