"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoopCircle } from "@/components/field/LoopCircle";
import { ClosureOptions } from "./ClosureOptions";
import { NextStepInput } from "./NextStepInput";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { platform } from "@/lib/platform";
import type { LoopDTO, ClosureAction } from "@/lib/types/loop";

import { applyDummyLoopAction } from "@/lib/dev/dummy-data";

interface LoopDetailSheetProps {
  loop: LoopDTO | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (loop: LoopDTO) => void;
  onRemove: (id: string) => void;
  onClosing?: (id: string) => void;
  allLoops?: LoopDTO[];
  dummyMode?: boolean;
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
  const [mode, setMode] = useState<"default" | "edit" | "merge">("default");
  const [editLabel, setEditLabel] = useState("");
  const trapRef = useFocusTrap(open);

  useEffect(() => {
    if (loop) setEditLabel(loop.label);
    if (!open) {
      setMode("default");
      setSelectedAction(null);
      setConfirmText(null);
    }
  }, [loop, open]);

  if (!loop) return null;

  const loopId = loop.id;
  const mergeTargets = allLoops.filter((l) => l.id !== loopId && l.state !== "done" && l.state !== "released");

  const handleAction = async (
    action: ClosureAction,
    extras?: { nextStep?: string; resurfaceAfter?: string }
  ) => {
    if (action === "next_step_known" && !extras?.nextStep) {
      setSelectedAction("next_step_known");
      return;
    }

    setLoading(true);
    try {
      if (dummyMode) {
        const updated = applyDummyLoopAction(loop, action, extras);
        if (action === "done" || action === "released") {
          platform.vibrate(10);
          onClosing?.(loopId);
          setTimeout(() => onUpdate(updated), 900);
          setTimeout(() => onRemove(loopId), 3900);
          onClose();
          return;
        }
        if (action === "next_step_known") {
          setConfirmText("Contained.");
          setTimeout(() => {
            onUpdate(updated);
            onClose();
            setConfirmText(null);
            setSelectedAction(null);
          }, 1200);
          return;
        }
        onUpdate(updated);
        onClose();
        return;
      }

      const res = await fetch(`/api/loops/${loopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extras }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (action === "done" || action === "released") {
        platform.vibrate(10);
        onClosing?.(loopId);
        setTimeout(() => onUpdate(data.loop), 900);
        setTimeout(() => onRemove(loopId), 3900);
        onClose();
        return;
      }

      if (action === "next_step_known") {
        setConfirmText("Contained.");
        setTimeout(() => {
          onUpdate(data.loop);
          onClose();
          setConfirmText(null);
          setSelectedAction(null);
        }, 1200);
        return;
      }

      onUpdate(data.loop);
      onClose();
    } catch {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  async function saveLabel() {
    if (dummyMode) {
      onUpdate({ ...loop!, label: editLabel.trim(), updatedAt: new Date().toISOString() });
      setMode("default");
      onClose();
      return;
    }
    const res = await fetch(`/api/loops/${loopId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editLabel.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      onUpdate(data.loop);
      setMode("default");
      onClose();
    }
  }

  async function mergeInto(targetId: string) {
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
    if (res.ok) {
      onRemove(loopId);
      onClose();
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
            className="fixed inset-0 bg-paper/60 z-40"
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
            className="fixed inset-x-0 bottom-0 z-50 bg-sheet rounded-t-sheet shadow-sheet px-7 pt-3 pb-10 min-h-[58vh] max-h-[85vh] overflow-y-auto safe-area-bottom"
          >
            <div className="w-[42px] h-[5px] rounded-full bg-border mx-auto mb-4" aria-hidden />

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
                <input
                  id="edit-label"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-paper font-ui text-sm min-h-[48px]"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMode("default")} className="flex-1 py-3 rounded-full border border-border font-ui text-sm min-h-[48px]">
                    Cancel
                  </button>
                  <button type="button" onClick={saveLabel} className="flex-1 py-3 rounded-full bg-accent text-white font-ui text-sm min-h-[48px]">
                    Save
                  </button>
                </div>
              </div>
            ) : mode === "merge" ? (
              <div className="space-y-3 max-w-sm mx-auto">
                <p className="font-ui text-sm text-ink-muted text-center">Merge into</p>
                {mergeTargets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => mergeInto(t.id)}
                    className="w-full py-3 rounded-full border border-border font-ui text-sm text-ink-soft min-h-[48px] hover:border-accent"
                  >
                    {t.label}
                  </button>
                ))}
                <button type="button" onClick={() => setMode("default")} className="w-full py-2 font-ui text-sm text-ink-faint min-h-[48px]">
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h2 id="loop-sheet-title" className="font-heading text-[26px] font-medium text-ink text-center">
                  {loop.label}
                </h2>
                <p className="font-ui text-[15px] text-[#8A7E70] text-center mt-2 mb-5">
                  What would help you release this?
                </p>

                {confirmText ? (
                  <p className="font-ui text-center text-ink-muted py-8">{confirmText}</p>
                ) : selectedAction === "next_step_known" ? (
                  <NextStepInput
                    onSave={(nextStep) => handleAction("next_step_known", { nextStep })}
                    onCancel={() => setSelectedAction(null)}
                  />
                ) : (
                  <ClosureOptions onSelect={handleAction} disabled={loading} />
                )}

                {!confirmText && selectedAction !== "next_step_known" && (
                  <div className="flex flex-wrap justify-center gap-4 mt-8 font-ui text-xs text-ink-faint">
                    {mergeTargets.length > 0 && (
                      <button type="button" onClick={() => setMode("merge")} className="hover:text-ink-soft min-h-[48px] px-2">
                        merge with another loop
                      </button>
                    )}
                    <button type="button" onClick={() => setMode("edit")} className="hover:text-ink-soft min-h-[48px] px-2">
                      edit label
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (dummyMode) {
                          onRemove(loopId);
                          onClose();
                          return;
                        }
                        await fetch(`/api/loops/${loopId}`, { method: "DELETE" });
                        onRemove(loopId);
                      }}
                      className="hover:text-ink-soft min-h-[48px] px-2"
                    >
                      delete
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
