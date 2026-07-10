"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoopCircle } from "@/components/field/LoopCircle";
import { ClosureOptions } from "./ClosureOptions";
import { NextStepInput } from "./NextStepInput";
import { LoopHistoryPanel } from "./LoopHistoryPanel";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { platform } from "@/lib/platform";
import { track } from "@/lib/analytics";
import type { LoopDTO, ClosureAction } from "@/lib/types/loop";
import { canTransition } from "@/lib/loops/state";
import { applyDummyLoopAction } from "@/lib/dev/dummy-data";

interface LoopDetailSheetProps {
  loop: LoopDTO | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (loop: LoopDTO) => void;
  onRemove: (id: string) => void;
  onClosing?: (id: string, action: "done" | "released") => void;
  allLoops?: LoopDTO[];
  dummyMode?: boolean;
}

function ActionError({ message }: { message: string }) {
  return (
    <p className="font-ui text-sm text-accent text-center mb-4" role="alert">
      {message}
    </p>
  );
}

export function LoopDetailSheet({
  loop,
  open,
  onClose,
  onUpdate,
  onRemove,
  onClosing,
  allLoops = [],
  dummyMode = false,
}: LoopDetailSheetProps) {
  const [selectedAction, setSelectedAction] = useState<ClosureAction | null>(null);
  const [confirmText, setConfirmText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mode, setMode] = useState<"default" | "edit" | "merge">("default");
  const [view, setView] = useState<"now" | "history">("now");
  const [editLabel, setEditLabel] = useState("");
  const trapRef = useFocusTrap(open);

  useEffect(() => {
    if (loop) setEditLabel(loop.label);
    if (!open) {
      setMode("default");
      setSelectedAction(null);
      setConfirmText(null);
      setActionError(null);
      setView("now");
    }
  }, [loop, open]);

  if (!loop) return null;

  const loopId = loop.id;
  const mergeTargets = allLoops.filter(
    (l) => l.id !== loopId && l.state !== "done" && l.state !== "released"
  );

  const finishWithConfirm = (text: string, updated: LoopDTO, delayMs = 1200) => {
    setConfirmText(text);
    setTimeout(() => {
      onUpdate(updated);
      onClose();
      setConfirmText(null);
      setSelectedAction(null);
    }, delayMs);
  };

  const trackStateChange = (
    action: ClosureAction,
    updated: LoopDTO,
    fromState = loop.state
  ) => {
    const toState =
      action === "still_on_mind"
        ? fromState
        : action === "done"
          ? "done"
          : action === "released"
            ? "released"
            : action === "parked"
              ? "parked"
              : action === "next_step_known"
                ? "next_step_known"
                : updated.state;
    track("loop_state_changed", {
      from: fromState,
      to: toState,
      category: loop.category,
      weight: updated.weight,
      action,
    });
  };

  const handleAction = async (
    action: ClosureAction,
    extras?: { nextStep?: string; resurfaceAfter?: string }
  ) => {
    if (action === "next_step_known" && !extras?.nextStep) {
      setActionError(null);
      setSelectedAction("next_step_known");
      return;
    }

    if (action !== "still_on_mind") {
      const targetState =
        action === "done"
          ? "done"
          : action === "released"
            ? "released"
            : action === "parked"
              ? "parked"
              : action === "next_step_known"
                ? "next_step_known"
                : loop.state;
      if (!canTransition(loop.state, targetState)) {
        setActionError(`This option isn't available for this loop right now.`);
        return;
      }
    }

    setLoading(true);
    setActionError(null);
    try {
      if (dummyMode) {
        const updated = applyDummyLoopAction(loop, action, extras);
        if (action === "done" || action === "released") {
          platform.vibrate(10);
          trackStateChange(action, updated);
          onClosing?.(loopId, action);
          setTimeout(() => onUpdate(updated), 900);
          setTimeout(() => onRemove(loopId), 3900);
          onClose();
          return;
        }
        if (action === "next_step_known") {
          trackStateChange(action, updated);
          finishWithConfirm("Contained.", updated);
          return;
        }
        if (action === "parked") {
          trackStateChange(action, updated);
          finishWithConfirm("Parked for later.", updated);
          return;
        }
        if (action === "still_on_mind") {
          trackStateChange(action, updated);
          finishWithConfirm("Okay. It can stay here where you can see it.", updated, 1500);
          return;
        }
        onUpdate(updated);
        onClose();
        return;
      }

      const res = await fetch(`/api/loops/${loopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "next_step_known" && extras?.nextStep
            ? { nextStep: extras.nextStep }
            : { action, ...extras }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");

      if (action === "done" || action === "released") {
        platform.vibrate(10);
        trackStateChange(action, data.loop);
        onClosing?.(loopId, action);
        setTimeout(() => onUpdate(data.loop), 900);
        setTimeout(() => onRemove(loopId), 3900);
        onClose();
        return;
      }

      if (action === "next_step_known") {
        trackStateChange(action, data.loop);
        finishWithConfirm("Contained.", data.loop);
        return;
      }

      if (action === "parked") {
        trackStateChange(action, data.loop);
        finishWithConfirm("Parked for later.", data.loop);
        return;
      }

      if (action === "still_on_mind") {
        trackStateChange(action, data.loop);
        finishWithConfirm("Okay. It can stay here where you can see it.", data.loop, 1500);
        return;
      }

      onUpdate(data.loop);
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setLoading(false);
    }
  };

  async function saveLabel() {
    if (!loop) return;
    const trimmed = editLabel.trim();
    if (!trimmed) {
      setActionError("Label cannot be empty.");
      return;
    }

    setLoading(true);
    setActionError(null);
    try {
      if (dummyMode) {
        onUpdate({ ...loop, label: trimmed, updatedAt: new Date().toISOString() });
        setMode("default");
        onClose();
        return;
      }
      const res = await fetch(`/api/loops/${loopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save label.");
      onUpdate(data.loop);
      setMode("default");
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save label.");
    } finally {
      setLoading(false);
    }
  }

  async function mergeInto(targetId: string) {
    setLoading(true);
    setActionError(null);
    try {
      if (dummyMode) {
        onRemove(loopId);
        onClose();
        return;
      }
      const res = await fetch(`/api/loops/${loopId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLoopId: targetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not merge.");
      if (data.loop) onUpdate(data.loop);
      onRemove(loopId);
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not merge.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteLoop() {
    setLoading(true);
    setActionError(null);
    try {
      if (dummyMode) {
        onRemove(loopId);
        onClose();
        return;
      }
      const res = await fetch(`/api/loops/${loopId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Could not delete.");
      }
      onRemove(loopId);
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/10 backdrop-blur-[3px] z-40"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="loop-sheet-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-sheet/95 rounded-t-sheet shadow-float px-7 pt-3 pb-10 min-h-[58vh] max-h-[85vh] overflow-y-auto safe-area-bottom border-t border-border/80 backdrop-blur-xl"
          >
            <div className="w-[46px] h-[5px] rounded-full bg-border mx-auto mb-5" aria-hidden />

            <div className="flex justify-center mb-2">
              <LoopCircle
                label=""
                state={loop.state}
                weight={loop.weight}
                emotionalIntensity={loop.emotionalIntensity}
                visualSeed={loop.visualSeed}
                size={112}
                showLabel={false}
              />
            </div>

            {mode === "edit" ? (
              <div className="space-y-4 max-w-sm mx-auto">
                <label htmlFor="edit-label" className="font-ui text-xs text-ink-faint">
                  Edit label
                </label>
                {actionError && <ActionError message={actionError} />}
                <input
                  id="edit-label"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-paper/80 font-ui text-sm min-h-[48px] shadow-[var(--shadow-inset)] focus:outline-none focus:border-accent"
                  disabled={loading}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("default");
                      setActionError(null);
                    }}
                    className="flex-1 py-3 rounded-full border border-border bg-sheet/60 font-ui text-sm min-h-[48px] transition hover:border-accent/40"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveLabel}
                    disabled={loading}
                    className="flex-1 py-3 rounded-full bg-accent text-white font-ui text-sm min-h-[48px] shadow-subtle transition hover:bg-accent-hover disabled:opacity-40"
                  >
                    {loading ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : mode === "merge" ? (
              <div className="space-y-3 max-w-sm mx-auto">
                <p className="font-ui text-sm text-ink-muted text-center">Merge into</p>
                {actionError && <ActionError message={actionError} />}
                {mergeTargets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => mergeInto(t.id)}
                    disabled={loading}
                    className="w-full py-3 rounded-full border border-border bg-paper/45 font-ui text-sm text-ink-soft min-h-[48px] transition hover:border-accent hover:-translate-y-0.5 disabled:opacity-40"
                  >
                    {t.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMode("default");
                    setActionError(null);
                  }}
                  className="w-full py-2 font-ui text-sm text-ink-faint min-h-[48px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h2 id="loop-sheet-title" className="font-heading text-[26px] font-medium text-ink text-center">
                  {loop.label}
                </h2>
                <div className="mx-auto mt-4 mb-6 grid max-w-xs grid-cols-2 rounded-full border border-border bg-paper/45 p-1 font-ui text-xs">
                  <button
                    type="button"
                    onClick={() => setView("now")}
                    className={`min-h-[40px] rounded-full px-4 transition ${
                      view === "now" ? "bg-sheet text-ink shadow-subtle" : "text-ink-faint"
                    }`}
                    aria-pressed={view === "now"}
                  >
                    Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("history")}
                    className={`min-h-[40px] rounded-full px-4 transition ${
                      view === "history" ? "bg-sheet text-ink shadow-subtle" : "text-ink-faint"
                    }`}
                    aria-pressed={view === "history"}
                  >
                    Story
                  </button>
                </div>

                {view === "history" ? (
                  <div className="mx-auto max-w-md pb-2">
                    <LoopHistoryPanel loop={loop} dummyMode={dummyMode} />
                  </div>
                ) : (
                  <>
                    <div className="mx-auto mb-6 flex max-w-sm flex-wrap justify-center gap-x-4 gap-y-2 font-ui text-xs text-ink-faint">
                      <span className="capitalize">{loop.category}</span>
                      <span>{loop.mentionCount} mention{loop.mentionCount === 1 ? "" : "s"}</span>
                      <span>Weight {loop.weight}/5</span>
                    </div>
                    {loop.nextStep && (
                      <div className="mx-auto mb-6 max-w-sm rounded-2xl border border-border-soft bg-paper/45 px-4 py-3 text-center">
                        <p className="font-ui text-[10px] uppercase tracking-[1.8px] text-ink-placeholder">Next step</p>
                        <p className="mt-1 font-heading text-[15px] text-ink-soft">{loop.nextStep}</p>
                      </div>
                    )}
                    <p className="mb-6 mt-2 text-center font-ui text-[15px] text-ink-muted">
                      What would help you release this?
                    </p>

                    {confirmText ? (
                      <p className="py-8 text-center font-ui text-ink-muted">{confirmText}</p>
                    ) : selectedAction === "next_step_known" ? (
                      <>
                        {actionError && <ActionError message={actionError} />}
                        <NextStepInput
                          onSave={(nextStep) => handleAction("next_step_known", { nextStep })}
                          onCancel={() => {
                            setSelectedAction(null);
                            setActionError(null);
                          }}
                          saving={loading}
                        />
                      </>
                    ) : (
                      <>
                        {actionError && <ActionError message={actionError} />}
                        <ClosureOptions
                          onSelect={handleAction}
                          onPark={(resurfaceAfter) =>
                            handleAction(
                              "parked",
                              resurfaceAfter ? { resurfaceAfter } : undefined
                            )
                          }
                          disabled={loading}
                        />
                      </>
                    )}

                    {!confirmText && selectedAction !== "next_step_known" && (
                      <div className="mt-8 flex flex-wrap justify-center gap-4 font-ui text-xs text-ink-faint">
                        {mergeTargets.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setMode("merge");
                              setActionError(null);
                            }}
                            className="min-h-[48px] px-2 hover:text-ink-soft"
                          >
                            merge with another loop
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setMode("edit");
                            setActionError(null);
                          }}
                          className="min-h-[48px] px-2 hover:text-ink-soft"
                        >
                          edit label
                        </button>
                        <button
                          type="button"
                          onClick={deleteLoop}
                          disabled={loading}
                          className="min-h-[48px] px-2 hover:text-ink-soft disabled:opacity-40"
                        >
                          delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
