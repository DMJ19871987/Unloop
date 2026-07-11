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
  onClosing?: (id: string, action: "done" | "released") => void;
  newLoopIds?: Set<string>;
  closingLoopId?: string | null;
  closingAction?: "done" | "released" | null;
  dummyMode?: boolean;
}

export function LoopField({
  loops,
  onLoopUpdate,
  onLoopRemove,
  onClosing,
  newLoopIds,
  closingLoopId,
  closingAction,
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

  const { visibleLoops, collapsedLoops, collapsedCount, clusterLabel } = useMemo(() => {
    const { visible, collapsed } = partitionFieldLoops(
      loops.map((l) => ({
        id: l.id,
        state: l.state,
        weight: l.weight,
        emotionalIntensity: l.emotionalIntensity,
        label: l.label,
        visualSeed: l.visualSeed,
      })),
      false
    );

    const visibleCap = fieldSize.width < 480 ? 8 : 14;
    const cappedVisible = visible.slice(0, visibleCap);
    const hidden = [...visible.slice(visibleCap), ...collapsed];

    const allParked =
      hidden.length > 0 && hidden.every((item) => item.state === "parked");
    const label = allParked ? `${hidden.length} parked` : `${hidden.length} more`;

    const visibleIds = new Set(cappedVisible.map((item) => item.id));
    const hiddenIds = new Set(hidden.map((item) => item.id));
    return {
      visibleLoops: loops.filter((l) => visibleIds.has(l.id)),
      collapsedLoops: loops.filter((l) => hiddenIds.has(l.id)),
      collapsedCount: hidden.length,
      clusterLabel: label,
    };
  }, [fieldSize.width, loops]);

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

  const newLoopOrder = useMemo(() => {
    const order = new Map<string, number>();
    let i = 0;
    for (const loop of visibleLoops) {
      if (newLoopIds?.has(loop.id)) {
        order.set(loop.id, i++);
      }
    }
    return order;
  }, [visibleLoops, newLoopIds]);

  return (
    <div className="relative min-h-[85vh] flex flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-10 h-72 field-surface opacity-80" aria-hidden />
      <header className="relative z-10 px-6 sm:px-8 pt-6 pb-3 flex items-start justify-between gap-4">
        <div className="animate-float-in">
          <p className="font-ui text-[10px] uppercase tracking-[2.6px] text-ink-placeholder mb-1">
            Mental field
          </p>
          <h1 className="font-heading text-[26px] font-medium text-ink">Occupying you</h1>
          <SummaryBar loops={loops} />
        </div>
        <FieldToggle view="occupying" />
      </header>

      <div
        ref={fieldRef}
        className="relative flex-1 mx-auto w-full max-w-[420px] lg:max-w-[760px] min-h-[540px]"
      >
        <div
          className="pointer-events-none absolute inset-x-8 top-16 h-[360px] rounded-full border border-border/40 opacity-45"
          style={{ animation: "field-breathe 9s ease-in-out infinite" }}
          aria-hidden
        />
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 animate-float-in">
            <LoopCircle
              state="parked"
              weight={3}
              emotionalIntensity={2}
              visualSeed={0}
              arc={1}
              stroke="var(--closed)"
              opacity={0.4}
              showLabel={false}
              forField
            />
            <p className="font-heading italic text-ink-muted text-lg leading-relaxed mt-7 max-w-xs">
              A quiet head. It&apos;ll fill again — that&apos;s what heads do.
            </p>
            <Link
              href="/record"
              className="mt-5 inline-flex min-h-[48px] items-center rounded-full border border-border/70 bg-sheet/70 px-5 font-ui text-sm text-ink-faint shadow-subtle transition hover:border-accent/40 hover:text-accent-selected"
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
              const targetX = pos?.x ?? loop.x ?? centerX;
              const targetY = pos?.y ?? loop.y ?? centerY;
              const staggerIndex = newLoopOrder.get(loop.id) ?? 0;

              return (
                <motion.div
                  key={loop.id}
                  className="absolute"
                  initial={
                    isNew
                      ? {
                          left: centerX,
                          top: centerY,
                          scale: 0.3,
                          opacity: 0,
                        }
                      : {
                          left: targetX,
                          top: targetY,
                          scale: 1,
                          opacity: 1,
                        }
                  }
                  animate={{
                    left: targetX,
                    top: targetY,
                    opacity: isClosing ? 0 : 1,
                    scale: isClosing ? 0.8 : 1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={
                    isNew
                      ? {
                          left: {
                            type: "spring",
                            stiffness: 120,
                            damping: 18,
                            delay: staggerIndex * 0.08,
                          },
                          top: {
                            type: "spring",
                            stiffness: 120,
                            damping: 18,
                            delay: staggerIndex * 0.08,
                          },
                          scale: {
                            type: "spring",
                            stiffness: 140,
                            damping: 16,
                            delay: staggerIndex * 0.08,
                          },
                          opacity: { duration: 0.3, delay: staggerIndex * 0.08 },
                        }
                      : {
                          duration: isClosing ? 3 : 0.3,
                          ease: "easeOut",
                        }
                  }
                >
                  <div className="-translate-x-1/2 -translate-y-1/2">
                  <motion.button
                    type="button"
                    onClick={() => setSelectedId(loop.id)}
                    className="group focus:outline-none"
                    aria-label={`${loop.label}, ${loop.state.replace(/_/g, " ")}`}
                    whileHover={{ scale: 1.035 }}
                    whileTap={{ scale: 0.96 }}
                  >
                  <LoopCircle
                    label={loop.label}
                    state={loop.state}
                    weight={loop.weight}
                    emotionalIntensity={loop.emotionalIntensity}
                    visualSeed={loop.visualSeed}
                    animateArc={isClosing ? 1 : undefined}
                    closingMode={isClosing ? closingAction ?? undefined : undefined}
                    drift={!isClosing}
                    labelOpacity={loop.state === "parked" ? 0.5 : 0.85}
                    labelPosition={pos?.labelPosition ?? "below"}
                    visibleCount={visibleLoops.length}
                    forField
                  />
                </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {collapsedCount > 0 && !showCollapsedCluster && (
          <button
            type="button"
            onClick={() => setShowCollapsedCluster(true)}
            className="absolute right-4 bottom-28 flex items-center gap-2 glass-panel rounded-full px-3 py-2 min-h-[48px] transition hover:-translate-y-0.5"
            aria-label={`${clusterLabel}, tap to expand`}
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
              {clusterLabel}
            </span>
          </button>
        )}

        {collapsedCount > 0 && showCollapsedCluster && (
          <div className="glass-panel absolute inset-x-4 bottom-24 z-30 max-h-[330px] overflow-y-auto rounded-[24px] p-3 shadow-float">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-sheet/90 px-2 pb-2 pt-1 backdrop-blur">
              <div>
                <p className="font-ui text-[10px] uppercase tracking-[2px] text-ink-placeholder">Field index</p>
                <p className="font-heading text-base text-ink">More loops</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCollapsedCluster(false)}
                className="min-h-[44px] px-2 font-ui text-xs text-ink-faint hover:text-ink"
              >
                Close
              </button>
            </div>
            <div className="divide-y divide-border-soft">
              {collapsedLoops.map((loop) => (
                <button
                  key={loop.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(loop.id);
                    setShowCollapsedCluster(false);
                  }}
                  className="grid min-h-[58px] w-full grid-cols-[1fr_auto] items-center gap-3 px-2 text-left transition hover:pl-3"
                >
                  <span className="truncate font-heading text-sm text-ink-soft">{loop.label}</span>
                  <span className="font-ui text-[11px] capitalize text-ink-placeholder">
                    {loop.state.replace(/_/g, " ")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Link
        href="/offload"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2 focus:outline-none sm:bottom-7"
        aria-label="Empty your head"
      >
        <motion.div
          className="w-[68px] h-[68px] rounded-full bg-accent-breathe border border-accent/30 flex items-center justify-center shadow-float backdrop-blur"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
        >
          <div className="w-10 h-10 rounded-full bg-accent-button shadow-[var(--shadow-inset)]" />
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
        onClosing={(id, action) => {
          onClosing?.(id, action);
          setSelectedId(null);
        }}
        allLoops={loops}
        dummyMode={dummyMode}
      />
    </div>
  );
}
