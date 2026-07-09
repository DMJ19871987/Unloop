"use client";

import { useState } from "react";
import { LoopDetailSheet } from "@/components/sheet/LoopDetailSheet";
import type { LoopDTO } from "@/lib/types/loop";

interface ResurfaceFlowProps {
  loops: LoopDTO[];
  onComplete: () => void;
  dummyMode?: boolean;
}

export function ResurfaceFlow({ loops, onComplete, dummyMode = false }: ResurfaceFlowProps) {
  const [index, setIndex] = useState(0);
  const current = loops[index] ?? null;

  if (!current) {
    onComplete();
    return null;
  }

  const handleUpdate = (_updated: LoopDTO) => {
    if (index < loops.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onComplete();
    }
  };

  const handleRemove = () => {
    if (index < loops.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onComplete();
    }
  };

  return (
    <LoopDetailSheet
      loop={current}
      open
      onClose={onComplete}
      onUpdate={handleUpdate}
      onRemove={handleRemove}
      dummyMode={dummyMode}
    />
  );
}
