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

export interface ExtractionResult {
  sessionId: string;
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
  flag: "crisis" | null;
}

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
