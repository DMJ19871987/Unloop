"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type PanInfo, useReducedMotion } from "framer-motion";
import { LoopCircle } from "./LoopCircle";
import { GravityNextStepPrompt } from "./GravityNextStepPrompt";
import { SummaryBar } from "./SummaryBar";
import { FieldToggle } from "./FieldToggle";
import { FieldMotionToggle, type FieldMotionMode } from "./FieldMotionToggle";
import { LoopDetailSheet } from "@/components/sheet/LoopDetailSheet";
import type { LoopDTO } from "@/lib/types/loop";
import { platform } from "@/lib/platform";
import { track } from "@/lib/analytics";
import {
  computeLoopLayout,
  fieldLabelMaxWidth,
  fieldLayoutCircleSize,
  fieldRailWidth,
  selectVisibleFieldLoops,
} from "@/lib/loops/layout";
import { computeFloatingLoopLayout } from "@/lib/loops/float-layout";
import {
  GRAVITY_ZONES,
  gravityZoneForState,
  stateForGravityZone,
  type GravityZone,
} from "@/lib/loops/gravity";

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

type FieldDragEvent = MouseEvent | TouchEvent | PointerEvent;
const FIELD_MOTION_KEY = "field-motion-mode";

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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<GravityZone | null>(null);
  const [pendingReadyId, setPendingReadyId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [preferredVisibleId, setPreferredVisibleId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [fieldMotion, setFieldMotion] = useState<FieldMotionMode>("fixed");
  const fieldRef = useRef<HTMLDivElement>(null);
  const zoneRefs = useRef(new Map<GravityZone, HTMLDivElement>());
  const didDragRef = useRef(false);
  const [fieldSize, setFieldSize] = useState({ width: 390, height: 520 });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let active = true;
    platform.getLocal<FieldMotionMode>(FIELD_MOTION_KEY).then((saved) => {
      if (active && (saved === "fixed" || saved === "float")) setFieldMotion(saved);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        const next = {
          width: Math.max(320, Math.round(rect.width)),
          height: Math.max(480, Math.round(rect.height)),
        };
        setFieldSize((current) =>
          current.width === next.width && current.height === next.height ? current : next
        );
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  const selected = loops.find((l) => l.id === selectedId) ?? null;
  const pendingReadyLoop = loops.find((l) => l.id === pendingReadyId) ?? null;
  const compact = fieldSize.width < 640;
  const leftInset = fieldRailWidth(fieldSize.width);
  const labelMaxWidth = fieldLabelMaxWidth(fieldSize.width);

  const { visibleLoops, collapsedLoops, collapsedCount } = useMemo(() => {
    const { visible, collapsed } = selectVisibleFieldLoops(loops, {
      perZoneCap: fieldSize.width < 640 ? 4 : fieldSize.width < 1024 ? 6 : 8,
      totalCap: fieldSize.width < 640 ? 12 : 14,
      preferredId: preferredVisibleId,
    });
    return {
      visibleLoops: visible,
      collapsedLoops: collapsed,
      collapsedCount: collapsed.length,
    };
  }, [fieldSize.width, loops, preferredVisibleId]);

  const fixedPositions = useMemo(
    () =>
      computeLoopLayout(
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
        { visibleCount: visibleLoops.length, leftInset }
      ),
    [visibleLoops, fieldSize, leftInset]
  );

  const positions = useMemo(() => {
    const layout =
      fieldMotion === "float"
        ? computeFloatingLoopLayout(
            visibleLoops,
            fixedPositions,
            fieldSize.width,
            fieldSize.height,
            { leftInset, visibleCount: visibleLoops.length }
          )
        : fixedPositions;
    return new Map(layout.map((p) => [p.id, p]));
  }, [fieldMotion, fieldSize, fixedPositions, leftInset, visibleLoops]);

  function changeFieldMotion(mode: FieldMotionMode) {
    setFieldMotion(mode);
    void platform.storeLocal(FIELD_MOTION_KEY, mode);
    track("field_motion_changed", { mode });
  }

  const zoneCounts = useMemo(() => {
    const counts: Record<GravityZone, number> = { ready: 0, clarify: 0, waiting: 0 };
    for (const loop of loops) {
      const zone = gravityZoneForState(loop.state);
      if (zone) counts[zone] += 1;
    }
    return counts;
  }, [loops]);

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

  function dragClientY(event: FieldDragEvent, info: PanInfo): number {
    if ("clientY" in event) return event.clientY;
    const touch = event.touches[0] ?? event.changedTouches[0];
    return touch?.clientY ?? info.point.y - window.scrollY;
  }

  function zoneAtClientY(clientY: number): GravityZone | null {
    for (const zone of GRAVITY_ZONES) {
      const rect = zoneRefs.current.get(zone.id)?.getBoundingClientRect();
      if (rect && clientY >= rect.top && clientY < rect.bottom) return zone.id;
    }
    return null;
  }

  async function moveLoop(loop: LoopDTO, zone: GravityZone, nextStep?: string) {
    setMovingId(loop.id);
    setMoveError(null);

    try {
      if (dummyMode) {
        const now = new Date();
        const updated: LoopDTO = {
          ...loop,
          state: stateForGravityZone(zone),
          nextStep: zone === "ready" ? nextStep ?? loop.nextStep : zone === "clarify" ? null : loop.nextStep,
          resurfaceAfter:
            zone === "waiting"
              ? loop.resurfaceAfter ?? new Date(now.getTime() + 21 * 86400000).toISOString()
              : null,
          updatedAt: now.toISOString(),
        };
        setPreferredVisibleId(loop.id);
        onLoopUpdate(updated);
        setPendingReadyId(null);
        return;
      }

      const response = await fetch(`/api/loops/${loop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gravityZone: zone, nextStep }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not move this loop.");
      setPreferredVisibleId(loop.id);
      onLoopUpdate(data.loop);
      setPendingReadyId(null);
    } catch (error) {
      setMoveError(error instanceof Error ? error.message : "Could not move this loop.");
    } finally {
      setMovingId(null);
    }
  }

  function finishDrag(loop: LoopDTO, event: FieldDragEvent, info: PanInfo) {
    const zone = zoneAtClientY(dragClientY(event, info));
    setDraggingId(null);
    setDropZone(null);
    window.setTimeout(() => {
      didDragRef.current = false;
    }, 0);

    if (!zone || zone === gravityZoneForState(loop.state)) return;
    if (zone === "ready" && !loop.nextStep) {
      setMoveError(null);
      setPendingReadyId(loop.id);
      return;
    }
    void moveLoop(loop, zone);
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-8rem)] flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-10 h-72 field-surface opacity-80" aria-hidden />
      <header className="relative z-10 mx-auto grid w-full max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-start gap-2 px-4 pb-3 pt-5 sm:gap-4 sm:px-8 sm:pt-6">
        <div className="min-w-0 animate-float-in">
          <p className="font-ui text-[10px] uppercase tracking-[2.6px] text-ink-placeholder mb-1">
            Mental field
          </p>
          <h1 className="font-heading text-[24px] font-medium leading-tight text-ink sm:text-[26px]">Occupying you</h1>
          <SummaryBar loops={loops} />
          {collapsedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowCollapsedCluster(true)}
              className="mt-2 min-h-[36px] font-ui text-[11px] text-accent-selected transition hover:text-accent"
            >
              {collapsedCount} more in your field
            </button>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <FieldToggle view="occupying" />
          <FieldMotionToggle mode={fieldMotion} onChange={changeFieldMotion} />
        </div>
      </header>

      <div
        ref={fieldRef}
        className="relative mx-auto min-h-[570px] w-full max-w-[1600px] flex-1 overflow-hidden sm:min-h-[660px] lg:min-h-[calc(100dvh-12rem)]"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {GRAVITY_ZONES.map((zone, index) => (
            <div
              key={zone.id}
              ref={(node) => {
                if (node) zoneRefs.current.set(zone.id, node);
                else zoneRefs.current.delete(zone.id);
              }}
              className={`absolute inset-x-0 transition-colors ${
                index < GRAVITY_ZONES.length - 1 ? "border-b" : ""
              }`}
              style={{
                top: `${index * 33.333}%`,
                height: "33.334%",
                borderColor: "var(--field-rule)",
              }}
            >
              <div
                className={`absolute inset-y-0 right-0 transition-colors ${
                  draggingId && dropZone === zone.id ? "bg-accent-tint/30" : ""
                }`}
                style={{ left: leftInset }}
              />
              <div
                className={`absolute inset-y-0 left-0 flex flex-col justify-center border-r bg-paper/20 px-3 transition-colors lg:px-5 ${
                  draggingId && dropZone === zone.id
                    ? "bg-accent-tint/45 text-accent-selected"
                    : "text-ink-placeholder"
                }`}
                style={{ width: leftInset, borderColor: "var(--field-rule)" }}
              >
                <span className="font-ui text-[9px] font-medium uppercase leading-tight tracking-[1.2px] sm:text-[10px] lg:text-[11px]">
                  {compact ? zone.shortLabel : zone.label}
                </span>
                <span className="mt-1 font-ui text-[10px] tabular-nums text-ink-faint">
                  {zoneCounts[zone.id]}
                </span>
                <span className="mt-2 hidden font-ui text-[10px] leading-snug text-ink-placeholder sm:block lg:text-[11px]">
                  {zone.description}
                </span>
              </div>
            </div>
          ))}
        </div>
        {moveError && !pendingReadyLoop && (
          <p className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full bg-sheet/95 px-4 py-2 font-ui text-xs text-accent shadow-subtle" role="alert">
            {moveError}
          </p>
        )}
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
                  className={`absolute z-10 ${movingId === loop.id ? "opacity-60" : ""}`}
                  drag={!isClosing}
                  dragMomentum={false}
                  dragSnapToOrigin
                  onDragStart={() => {
                    didDragRef.current = true;
                    setDraggingId(loop.id);
                    setDropZone(gravityZoneForState(loop.state));
                    setMoveError(null);
                  }}
                  onDrag={(event, info) =>
                    setDropZone(zoneAtClientY(dragClientY(event, info)))
                  }
                  onDragEnd={(event, info) => finishDrag(loop, event, info)}
                  whileDrag={{ scale: 1.06, zIndex: 40, cursor: "grabbing" }}
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
                      onClick={() => {
                        if (!didDragRef.current) setSelectedId(loop.id);
                      }}
                      className="group cursor-grab touch-none focus:outline-none"
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
                        size={fieldLayoutCircleSize(loop, fieldSize.width, visibleLoops.length)}
                        animateArc={isClosing ? 1 : undefined}
                        closingMode={isClosing ? closingAction ?? undefined : undefined}
                        drift={
                          fieldMotion === "float" &&
                          reducedMotion !== true &&
                          !isClosing &&
                          draggingId !== loop.id
                        }
                        labelOpacity={loop.state === "parked" ? 0.5 : 0.85}
                        labelPosition={pos?.labelPosition ?? "below"}
                        visibleCount={visibleLoops.length}
                        labelMaxWidth={labelMaxWidth}
                        compactLabel={compact}
                        forField
                      />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {collapsedCount > 0 && showCollapsedCluster && (
          <div className="glass-panel absolute inset-x-4 bottom-4 z-30 max-h-[420px] overflow-y-auto rounded-[24px] p-3 shadow-float sm:bottom-8">
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

      <LoopDetailSheet
        loop={selected}
        open={!!selected}
        onClose={() => setSelectedId(null)}
        onUpdate={(updated) => {
          setPreferredVisibleId(updated.id);
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

      <GravityNextStepPrompt
        loop={pendingReadyLoop}
        saving={movingId === pendingReadyId}
        error={pendingReadyLoop ? moveError : null}
        onSave={(nextStep) =>
          pendingReadyLoop ? moveLoop(pendingReadyLoop, "ready", nextStep) : undefined
        }
        onCancel={() => {
          setPendingReadyId(null);
          setMoveError(null);
        }}
      />
    </div>
  );
}
