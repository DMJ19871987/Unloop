"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LoopCircle } from "./LoopCircle";
import { SummaryBar } from "./SummaryBar";
import { FieldToggle } from "./FieldToggle";
import { LoopDetailSheet } from "@/components/sheet/LoopDetailSheet";
import type { LoopDTO } from "@/lib/types/loop";
import { computeLoopLayout } from "@/lib/loops/layout";

interface LoopFieldProps {
  loops: LoopDTO[];
  onLoopUpdate: (loop: LoopDTO) => void;
  onLoopRemove: (id: string) => void;
  onClosing?: (id: string) => void;
  newLoopIds?: Set<string>;
  closingLoopId?: string | null;
}

export function LoopField({
  loops,
  onLoopUpdate,
  onLoopRemove,
  onClosing,
  newLoopIds,
  closingLoopId,
}: LoopFieldProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showParkedCluster, setShowParkedCluster] = useState(false);

  const selected = loops.find((l) => l.id === selectedId) ?? null;

  const { visibleLoops, parkedCount, collapsedParked } = useMemo(() => {
    const parked = loops.filter((l) => l.state === "parked");
    const nonParked = loops.filter((l) => l.state !== "parked");

    if (loops.length <= 14 || showParkedCluster) {
      return {
        visibleLoops: loops,
        parkedCount: parked.length,
        collapsedParked: false,
      };
    }

    return {
      visibleLoops: nonParked,
      parkedCount: parked.length,
      collapsedParked: parked.length > 0,
    };
  }, [loops, showParkedCluster]);

  const positions = useMemo(() => {
    const layout = computeLoopLayout(
      visibleLoops.map((l) => ({
        id: l.id,
        state: l.state,
        weight: l.weight,
        emotionalIntensity: l.emotionalIntensity,
      })),
      390,
      520
    );
    return new Map(layout.map((p) => [p.id, p]));
  }, [visibleLoops]);

  const isEmpty = loops.length === 0;

  return (
    <div className="relative min-h-[85vh] flex flex-col">
      <header className="px-7 pt-4 pb-2 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-[21px] font-medium text-ink">Occupying you</h1>
          <SummaryBar loops={loops} />
        </div>
        <FieldToggle view="occupying" />
      </header>

      <div className="relative flex-1 mx-auto w-full max-w-[390px] min-h-[520px]">
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 rounded-full border-2 border-closed opacity-40 mb-6" />
            <p className="font-heading italic text-ink-muted text-base leading-relaxed">
              A quiet head. It&apos;ll fill again — that&apos;s what heads do.
            </p>
            <Link
              href="/record"
              className="mt-4 font-ui text-sm text-ink-faint hover:text-accent-selected"
            >
              View your record
            </Link>
          </div>
        ) : (
          <AnimatePresence>
            {visibleLoops.map((loop) => {
              const pos = positions.get(loop.id);
              const isClosing = closingLoopId === loop.id;
              const isNew = newLoopIds?.has(loop.id);

              return (
                <motion.button
                  key={loop.id}
                  type="button"
                  initial={
                    isNew
                      ? { opacity: 0, scale: 0.3, x: 195, y: 260 }
                      : { opacity: 1, scale: 1 }
                  }
                  animate={{
                    opacity: isClosing ? 0 : 1,
                    scale: isClosing ? 0.8 : 1,
                    x: 0,
                    y: 0,
                  }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{
                    duration: isClosing ? 3 : isNew ? 1.2 : 0.3,
                    ease: "easeOut",
                  }}
                  onClick={() => setSelectedId(loop.id)}
                  className="absolute focus:outline-none"
                  style={{
                    left: pos?.x ?? loop.x ?? 195,
                    top: pos?.y ?? loop.y ?? 260,
                    transform: "translate(-50%, -50%)",
                  }}
                  aria-label={`${loop.label}, ${loop.state.replace(/_/g, " ")}`}
                >
                  <LoopCircle
                    label={loop.label}
                    state={loop.state}
                    weight={loop.weight}
                    emotionalIntensity={loop.emotionalIntensity}
                    visualSeed={loop.visualSeed}
                    animateArc={isClosing ? 1 : undefined}
                    drift={!isClosing}
                    labelOpacity={loop.state === "parked" ? 0.5 : 0.85}
                  />
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}

        {collapsedParked && !showParkedCluster && (
          <button
            type="button"
            onClick={() => setShowParkedCluster(true)}
            className="absolute right-2 bottom-24 font-ui text-xs text-ink-faint bg-sheet border border-border rounded-full px-3 py-2 min-h-[36px]"
          >
            {parkedCount} parked
          </button>
        )}
      </div>

      <Link
        href="/offload"
        className="fixed bottom-8 left-1/2 -translate-x-1/2 focus:outline-none"
        aria-label="Empty your head"
      >
        <motion.div
          className="w-14 h-14 rounded-full bg-accent-breathe border border-accent/30 flex items-center justify-center"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-8 h-8 rounded-full bg-accent-button" />
        </motion.div>
      </Link>

      <LoopDetailSheet
        loop={selected}
        open={!!selected}
        onClose={() => setSelectedId(null)}
        onUpdate={(updated) => {
          onLoopUpdate(updated);
        }}
        onRemove={(id) => {
          onLoopRemove(id);
        }}
        onClosing={(id) => {
          onClosing?.(id);
          setSelectedId(null);
        }}
        allLoops={loops}
      />
    </div>
  );
}
