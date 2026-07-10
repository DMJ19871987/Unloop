import type { LoopState } from "@/lib/loops/state";

/** State labels sent to / received from the extraction model. */
export type ApiLoopState = "open" | "next_step_known" | "parked" | "done" | "released";

export function toApiState(state: LoopState): ApiLoopState {
  if (state === "open_attention") return "open";
  return state;
}

export function fromApiState(state: ApiLoopState | string | null): LoopState | null {
  if (!state) return null;
  if (state === "open") return "open_attention";
  return state as LoopState;
}

export interface ExistingLoopContext {
  id: string;
  label: string;
  state: ApiLoopState;
  weight: number;
  emotional_intensity: number;
  category: string;
  next_step: string | null;
  mention_count: number;
  last_updated: string;
  last_note_snippet: string | null;
}

export interface ExtractedNewLoop {
  label: string;
  weight: number;
  emotional_intensity: number;
  category: string;
  next_step: string | null;
}

export interface ExtractedMatchedLoop {
  loop_id: string;
  mention_count_delta: number;
  weight_delta: -1 | 0 | 1 | 2;
  emotional_intensity_delta: -2 | -1 | 0 | 1 | 2;
  next_step: string | null;
  state_suggestion: ApiLoopState | null;
  confidence: number;
  evidence: string;
}

export interface MergeSuggestion {
  source_loop_id: string;
  target_loop_id: string;
  confidence: number;
  evidence: string;
}

export interface ExtractionModelOutput {
  new_loops: ExtractedNewLoop[];
  matched_loops: ExtractedMatchedLoop[];
  merge_suggestions: MergeSuggestion[];
  flag: "crisis" | null;
}

export interface LoopChangePayload {
  mention_count_delta?: number;
  weight_delta?: number;
  emotional_intensity_delta?: number;
  next_step?: string | null;
  state?: LoopState;
  merge?: { source_loop_id: string; target_loop_id: string };
}

export interface AppliedLoopChange {
  loop_id: string;
  mention_count_delta: number;
  weight_delta: number;
  emotional_intensity_delta: number;
  next_step: string | null;
  state?: LoopState;
  evidence?: string;
}

export type ProposalKind =
  | "close"
  | "release"
  | "park"
  | "merge"
  | "low_confidence_match"
  | "big_weight"
  | "big_intensity";

export interface ExtractionProposal {
  id: string;
  loop_id: string;
  kind: ProposalKind;
  summary: string;
  evidence: string;
  change: LoopChangePayload;
}

export interface ApplyPolicyResult {
  applied: AppliedLoopChange[];
  proposals: ExtractionProposal[];
}

export function clampWeight(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
}

export function clampEmotionalIntensity(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
}

export function confidenceThreshold(): number {
  const raw = process.env.CONFIDENCE_THRESHOLD;
  const parsed = raw ? parseFloat(raw) : 0.6;
  return Number.isFinite(parsed) ? parsed : 0.6;
}
