"use client";

import type { LoopDTO } from "@/lib/types/loop";

interface SummaryBarProps {
  loops: LoopDTO[];
}

export function SummaryBar({ loops }: SummaryBarProps) {
  const openAttention = loops.filter((l) => l.state === "open_attention").length;
  const nextStepKnown = loops.filter((l) => l.state === "next_step_known").length;
  const parked = loops.filter((l) => l.state === "parked").length;

  const parts: string[] = [];
  if (openAttention > 0) parts.push(`${openAttention} need attention`);
  if (nextStepKnown > 0) parts.push(`${nextStepKnown} have a next step`);
  if (parked > 0) parts.push(`${parked} parked`);

  const text = parts.length > 0 ? parts.join(" · ") : "Nothing occupying you right now";

  return (
    <p className="font-ui text-[12.5px] text-ink-faint mt-1 leading-relaxed">{text}</p>
  );
}
