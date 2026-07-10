"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ExtractionProposal } from "@/lib/ai/extraction-types";
import type { LoopDTO } from "@/lib/types/loop";

interface ProposalCardsProps {
  proposals: ExtractionProposal[];
  loops: LoopDTO[];
  onConfirm: (proposal: ExtractionProposal) => Promise<void>;
  onDismiss: (proposalId: string) => void;
}

export function ProposalCards({
  proposals,
  loops,
  onConfirm,
  onDismiss,
}: ProposalCardsProps) {
  if (proposals.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 px-4 pb-4 pointer-events-none">
      <AnimatePresence>
        {proposals.map((proposal) => {
          const loop = loops.find((l) => l.id === proposal.loop_id);
          return (
            <motion.div
              key={proposal.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-auto rounded-2xl border border-ink-faint/20 bg-paper/95 backdrop-blur-sm shadow-lg p-4 max-w-md mx-auto w-full"
            >
              <p className="font-ui text-sm text-ink font-medium mb-1">
                {proposal.summary}
              </p>
              {proposal.evidence && (
                <p className="font-body text-sm text-ink-faint italic mb-3">
                  &ldquo;{proposal.evidence}&rdquo;
                </p>
              )}
              {loop && (
                <p className="font-ui text-xs text-ink-faint mb-3">
                  {loop.label}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onConfirm(proposal)}
                  className="flex-1 rounded-full bg-ink text-paper font-ui text-sm py-2 px-4 hover:opacity-90 transition-opacity"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss(proposal.id)}
                  className="flex-1 rounded-full border border-ink-faint/30 font-ui text-sm py-2 px-4 text-ink-faint hover:text-ink transition-colors"
                >
                  Not now
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
