"use client";

import { useMemo } from "react";
import { LoopField } from "@/components/field/LoopField";
import { getDummyFieldLoops } from "@/lib/dev/dummy-data";

export default function DevFieldPage() {
  const loops = useMemo(() => getDummyFieldLoops(), []);

  return (
    <div className="bg-paper min-h-screen">
      <LoopField
        loops={loops}
        onLoopUpdate={() => {}}
        onLoopRemove={() => {}}
        dummyMode
      />
    </div>
  );
}
