import type { ExtractionProposal } from "@/lib/ai/extraction-types";

export const PENDING_PROPOSALS_KEY = "unloop-pending-proposals";

export function loadPendingProposals(): ExtractionProposal[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(PENDING_PROPOSALS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ExtractionProposal[];
  } catch {
    return [];
  }
}

/** Merge by proposal id — never clobber unconfirmed proposals from a prior offload. */
export function mergePendingProposals(incoming: ExtractionProposal[]): void {
  if (typeof sessionStorage === "undefined" || incoming.length === 0) return;
  const existing = loadPendingProposals();
  const byId = new Map(existing.map((p) => [p.id, p]));
  for (const proposal of incoming) {
    byId.set(proposal.id, proposal);
  }
  sessionStorage.setItem(
    PENDING_PROPOSALS_KEY,
    JSON.stringify([...byId.values()])
  );
}

export function removePendingProposal(proposalId: string): void {
  if (typeof sessionStorage === "undefined") return;
  const next = loadPendingProposals().filter((p) => p.id !== proposalId);
  if (next.length === 0) {
    sessionStorage.removeItem(PENDING_PROPOSALS_KEY);
  } else {
    sessionStorage.setItem(PENDING_PROPOSALS_KEY, JSON.stringify(next));
  }
}

/** Pull proposals stored under a legacy per-session key into the global pending list. */
export function migrateSessionProposals(sessionId: string): void {
  if (typeof sessionStorage === "undefined") return;
  const legacyKey = `unloop-proposals-${sessionId}`;
  const raw = sessionStorage.getItem(legacyKey);
  if (!raw) return;
  try {
    mergePendingProposals(JSON.parse(raw) as ExtractionProposal[]);
  } catch {
    // ignore corrupt legacy payload
  }
  sessionStorage.removeItem(legacyKey);
}
