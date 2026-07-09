"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LoopCircle } from "./LoopCircle";
import { SummaryBar } from "./SummaryBar";
import { FieldToggle } from "./FieldToggle";
import { LoopDetailSheet } from "@/components/sheet/LoopDetailSheet";
import type { LoopDTO } from "@/lib/types/loop";
import { computeLoopLayout, partitionFieldLoops } from "@/lib/loops/layout";

interface LoopFieldProps {
  loops: LoopDTO[];
  onLoopUpdate: (loop: LoopDTO) => void;
  onLoopRemove: (id: string) => void;
  onClosing?: (id: string) => void;
  newLoopIds?: Set<string>;
  closingLoopId?: string | null;
  dummyMode?: boolean;
}

export function LoopField({
  loops,
  onLoopUpdate,
  onLoopRemove,
  onClosing,
  newLoopIds,
  closingLoopId,
  dummyMode = false,
}: LoopFieldProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCollapsedCluster, setShowCollapsedCluster] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [fieldSize, setFieldSize] = useState({ width: 390, height: 520 });

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setFieldSize({
        width: Math.max(320, Math.round(rect.width)),
        height: Math.max(400, Math.round(rect.height)),
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selected = loops.find((l) => l.id === selectedId) ?? null;

  const { visibleLoops, collapsedLoops, collapsedCount } = useMemo(() => {
    const { visible, collapsed } = partitionFieldLoops(
      loops.map((l) => ({
        id: l.id,
        state: l.state,
        weight: l.weight,
        emotionalIntensity: l.emotionalIntensity,
        label: l.label,
        visualSeed: l.visualSeed,
      })),
      showCollapsedCluster
    );
    const visibleIds = new Set(visible.map((v) => v.id));
    return {
      visibleLoops: loops.filter((l) => visibleIds.has(l.id)),
      collapsedLoops: loops.filter((l) => collapsed.some((c) => c.id === l.id)),
      collapsedCount: collapsed.length,
    };
  }, [loops, showCollapsedCluster]);

  const positions = useMemo(() => {
    const layout = computeLoopLayout(
      visibleLoops.map((l) => ({
        id: l.id,
        state: l.state,
        weight: l.weight,
        emotionalIntensity: l.emotionalIntensity,
        label: l.label,
        visualSeed: l.visualSeed,
      })),
      fieldSize.width,
      fieldSize.height,
      { visibleCount: visibleLoops.length }
    );
    return new Map(layout.map((p) => [p.id, p]));
  }, [visibleLoops, fieldSize]);

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

      <div
        ref={fieldRef}
        className="relative flex-1 mx-auto w-full max-w-[390px] lg:max-w-[720px] min-h-[520px]"
      >
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
              const centerX = fieldSize.width / 2;
              const centerY = fieldSize.height / 2;

              return (
                <motion.div
                  key={loop.id}
                  className="absolute"
                  style={{
                    left: pos?.x ?? loop.x ?? centerX,
                    top: pos?.y ?? loop.y ?? centerY,
                    transform: "translate(-50%, -50%)",
                  }}
                  exit={{ opacity: 0 }}
                >
                  <motion.button
                    type="button"
                    initial={
                      isNew
                        ? { opacity: 0, scale: 0.3 }
                        : { opacity: 1, scale: 1 }
                    }
                    animate={{
                      opacity: isClosing ? 0 : 1,
                      scale: isClosing ? 0.8 : 1,
                    }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{
                      duration: isClosing ? 3 : isNew ? 1.2 : 0.3,
                      ease: "easeOut",
                    }}
                    onClick={() => setSelectedId(loop.id)}
                    className="focus:outline-none"
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
                    labelPosition={pos?.labelPosition ?? "below"}
                    visibleCount={visibleLoops.length}
                    forField
                  />
                </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {collapsedCount > 0 && !showCollapsedCluster && (
          <button
            type="button"
            onClick={() => setShowCollapsedCluster(true)}
            className="absolute right-3 bottom-24 flex items-center gap-2 bg-sheet border border-border rounded-full px-3 py-2 min-h-[40px] shadow-subtle"
            aria-label={`${collapsedCount} more loops, tap to expand`}
          >
            <span className="flex -space-x-1.5" aria-hidden>
              {collapsedLoops.slice(0, 3).map((l) => (
                <LoopCircle
                  key={l.id}
                  state={l.state}
                  weight={l.weight}
                  emotionalIntensity={l.emotionalIntensity}
                  visualSeed={l.visualSeed}
                  size={18}
                  showLabel={false}
                  forField
                  visibleCount={visibleLoops.length}
                />
              ))}
            </span>
            <span className="font-ui text-xs text-ink-faint whitespace-nowrap">
              {collapsedCount} more
            </span>
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
        dummyMode={dummyMode}
      />
    </div>
  );
}
