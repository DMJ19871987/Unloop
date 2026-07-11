"use client";

import { motion, AnimatePresence } from "framer-motion";
import { NextStepInput } from "@/components/sheet/NextStepInput";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { LoopDTO } from "@/lib/types/loop";

interface GravityNextStepPromptProps {
  loop: LoopDTO | null;
  saving: boolean;
  error: string | null;
  onSave: (nextStep: string) => void | Promise<void>;
  onCancel: () => void;
}

export function GravityNextStepPrompt({
  loop,
  saving,
  error,
  onSave,
  onCancel,
}: GravityNextStepPromptProps) {
  const trapRef = useFocusTrap(Boolean(loop));

  return (
    <AnimatePresence>
      {loop && (
        <>
          <motion.button
            type="button"
            aria-label="Cancel next step"
            className="fixed inset-0 z-40 cursor-default bg-ink/10 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gravity-next-step-title"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto rounded-t-sheet border-t border-border/70 bg-sheet/95 px-6 pb-10 pt-4 shadow-float backdrop-blur-xl safe-area-bottom sm:bottom-6 sm:max-w-[440px] sm:rounded-sheet sm:border"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            <div className="mx-auto mb-5 h-1 w-11 rounded-full bg-border sm:hidden" aria-hidden />
            <p className="mb-1 text-center font-ui text-[10px] uppercase tracking-[2px] text-accent-selected">
              Ready to move
            </p>
            <h2 id="gravity-next-step-title" className="text-center font-heading text-2xl text-ink">
              Give it a next step
            </h2>
            <p className="mx-auto mb-6 mt-2 max-w-xs text-center font-ui text-sm leading-relaxed text-ink-faint">
              &ldquo;{loop.label}&rdquo; can move up once there is one concrete action attached to it.
            </p>
            {error && (
              <p className="mb-3 text-center font-ui text-sm text-accent" role="alert">
                {error}
              </p>
            )}
            <NextStepInput onSave={onSave} onCancel={onCancel} saving={saving} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
