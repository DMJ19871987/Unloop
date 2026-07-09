"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RecordView } from "@/components/record/RecordView";
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

export default function RecordPage() {
  const router = useRouter();
  const [closedLoops, setClosedLoops] = useState<ClosedLoopDTO[]>([]);
  const [counter, setCounter] = useState("");
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecord = useCallback(async () => {
    const res = await fetch("/api/record");
    const data = await res.json();
    setClosedLoops(data.closedLoops ?? []);
    setCounter(data.counter ?? "");
    setWeeklySummaries(data.weeklySummaries ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handleReopen = async (id: string) => {
    const res = await fetch(`/api/loops/${id}/reopen`, { method: "POST" });
    if (res.ok) {
      setClosedLoops((prev) => prev.filter((l) => l.id !== id));
      router.push("/field");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="font-ui text-sm text-ink-faint">Loading your record…</p>
      </div>
    );
  }

  return (
    <RecordView
      closedLoops={closedLoops}
      counter={counter}
      weeklySummaries={weeklySummaries}
      onReopen={handleReopen}
    />
  );
}
