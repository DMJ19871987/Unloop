import type { LoopState } from "@/lib/loops/state";

export type LoopCategory =
  | "people"
  | "decisions"
  | "logistics"
  | "home"
  | "work"
  | "money"
  | "health"
  | "ideas"
  | "other";

export interface LoopDTO {
  id: string;
  label: string;
  state: LoopState;
  category: LoopCategory;
  weight: number;
  emotionalIntensity: number;
  nextStep: string | null;
  mentionCount: number;
  visualSeed: number;
  resurfaceAfter: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  x?: number;
  y?: number;
}

export interface LoopEventDTO {
  id: string;
  fromState: LoopState | null;
  toState: LoopState;
  note: string | null;
  createdAt: string;
}

export interface LoopDetailsDTO {
  loop: LoopDTO;
  events: LoopEventDTO[];
  source: {
    inputMode: string;
    createdAt: string;
    transcriptRetained: boolean;
  } | null;
}

import type { ExtractionProposal } from "@/lib/ai/extraction-types";
import type { CrisisResources } from "@/lib/safety/crisis-resources";

export interface CrisisExtractResult {
  crisis: true;
  sessionId: string;
  resources: CrisisResources;
  rateLimitWarning?: string;
}

export interface NormalExtractResult {
  crisis?: false;
  sessionId: string;
  created: LoopDTO[];
  updated: LoopDTO[];
  proposals: ExtractionProposal[];
  newLoops: LoopDTO[];
  matchedLoops: { id: string; label: string }[];
  loops: LoopDTO[];
  stats: {
    new: number;
    matched: number;
    total: number;
    openAttention: number;
    nextStepKnown: number;
    parked: number;
  };
  rateLimitWarning?: string;
  summary?: string;
}

export type ExtractApiResult = CrisisExtractResult | NormalExtractResult;

export type ClosureAction =
  | "done"
  | "next_step_known"
  | "parked"
  | "released"
  | "still_on_mind";

export interface TransitionRequest {
  action: ClosureAction;
  nextStep?: string;
  resurfaceAfter?: string;
  note?: string;
}
