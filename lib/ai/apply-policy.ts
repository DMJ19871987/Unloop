import { randomUUID } from "crypto";
import type { loops } from "@/lib/db/schema";
import {
  type AppliedLoopChange,
  type ApplyPolicyResult,
  type ExtractionModelOutput,
  type ExtractionProposal,
  type LoopChangePayload,
  type ProposalKind,
  clampEmotionalIntensity,
  clampWeight,
  confidenceThreshold,
  fromApiState,
} from "./extraction-types";

type LoopRow = typeof loops.$inferSelect;

function proposalSummary(kind: ProposalKind, label: string): string {
  switch (kind) {
    case "close":
      return `Mark "${label}" as done?`;
    case "release":
      return `Release "${label}" — it no longer matters?`;
    case "park":
      return `Park "${label}" for later?`;
    case "merge":
      return `Merge these loops?`;
    case "low_confidence_match":
      return `Update "${label}" from what you said?`;
    case "big_weight":
      return `"${label}" is taking a lot more space — apply?`;
    case "big_intensity":
      return `A big shift in how charged "${label}" feels — apply?`;
    default:
      return `Update "${label}"?`;
  }
}

function buildChangeFromMatch(
  match: ExtractionModelOutput["matched_loops"][number],
  includeWeight = true,
  includeIntensity = true,
  includeState = true
): LoopChangePayload {
  const change: LoopChangePayload = {
    mention_count_delta: match.mention_count_delta ?? 1,
  };
  if (includeWeight) change.weight_delta = match.weight_delta;
  if (includeIntensity) change.emotional_intensity_delta = match.emotional_intensity_delta;
  if (match.next_step) change.next_step = match.next_step;
  if (includeState) {
    const state = fromApiState(match.state_suggestion);
    if (state) change.state = state;
  }
  return change;
}

export function applyPolicy(
  modelOutput: ExtractionModelOutput,
  existingLoops: LoopRow[]
): ApplyPolicyResult {
  const threshold = confidenceThreshold();
  const loopMap = new Map(existingLoops.map((l) => [l.id, l]));
  const applied: AppliedLoopChange[] = [];
  const proposals: ExtractionProposal[] = [];

  for (const match of modelOutput.matched_loops) {
    const loop = loopMap.get(match.loop_id);
    if (!loop) continue;

    if (match.confidence < threshold) {
      proposals.push({
        id: randomUUID(),
        loop_id: match.loop_id,
        kind: "low_confidence_match",
        summary: proposalSummary("low_confidence_match", loop.label),
        evidence: match.evidence,
        change: buildChangeFromMatch(match),
      });
      continue;
    }

    const auto: AppliedLoopChange = {
      loop_id: match.loop_id,
      mention_count_delta: match.mention_count_delta ?? 1,
      weight_delta: 0,
      emotional_intensity_delta: 0,
      next_step: null,
      evidence: match.evidence,
    };

    if (match.weight_delta === 2) {
      proposals.push({
        id: randomUUID(),
        loop_id: match.loop_id,
        kind: "big_weight",
        summary: proposalSummary("big_weight", loop.label),
        evidence: match.evidence,
        change: { weight_delta: 2 },
      });
    } else {
      auto.weight_delta = match.weight_delta;
    }

    if (Math.abs(match.emotional_intensity_delta) === 2) {
      proposals.push({
        id: randomUUID(),
        loop_id: match.loop_id,
        kind: "big_intensity",
        summary: proposalSummary("big_intensity", loop.label),
        evidence: match.evidence,
        change: { emotional_intensity_delta: match.emotional_intensity_delta },
      });
    } else {
      auto.emotional_intensity_delta = match.emotional_intensity_delta;
    }

    if (match.next_step) {
      auto.next_step = match.next_step;
    }

    const suggested = fromApiState(match.state_suggestion);
    if (suggested === "next_step_known" && loop.state === "open_attention") {
      auto.state = "next_step_known";
    } else if (suggested === "done") {
      proposals.push({
        id: randomUUID(),
        loop_id: match.loop_id,
        kind: "close",
        summary: proposalSummary("close", loop.label),
        evidence: match.evidence,
        change: { state: "done" },
      });
    } else if (suggested === "released") {
      proposals.push({
        id: randomUUID(),
        loop_id: match.loop_id,
        kind: "release",
        summary: proposalSummary("release", loop.label),
        evidence: match.evidence,
        change: { state: "released" },
      });
    } else if (suggested === "parked") {
      proposals.push({
        id: randomUUID(),
        loop_id: match.loop_id,
        kind: "park",
        summary: proposalSummary("park", loop.label),
        evidence: match.evidence,
        change: { state: "parked" },
      });
    }

    const hasAuto =
      auto.weight_delta !== 0 ||
      auto.emotional_intensity_delta !== 0 ||
      auto.next_step !== null ||
      auto.state !== undefined ||
      auto.mention_count_delta > 0;

    if (hasAuto) {
      applied.push(auto);
    }
  }

  for (const merge of modelOutput.merge_suggestions ?? []) {
    const target = loopMap.get(merge.target_loop_id);
    const source = loopMap.get(merge.source_loop_id);
    if (!target || !source) continue;

    proposals.push({
      id: randomUUID(),
      loop_id: merge.target_loop_id,
      kind: "merge",
      summary: `Merge "${source.label}" into "${target.label}"?`,
      evidence: merge.evidence,
      change: {
        merge: {
          source_loop_id: merge.source_loop_id,
          target_loop_id: merge.target_loop_id,
        },
      },
    });
  }

  return { applied, proposals };
}

export function previewAppliedValues(
  loop: LoopRow,
  change: AppliedLoopChange | LoopChangePayload
): {
  weight: number;
  emotionalIntensity: number;
  mentionCount: number;
  nextStep: string | null;
  state: LoopRow["state"];
} {
  const mentionDelta = change.mention_count_delta ?? 0;
  const weightDelta = change.weight_delta ?? 0;
  const eiDelta = change.emotional_intensity_delta ?? 0;

  let state = loop.state;
  if ("state" in change && change.state) {
    state = fromApiState(change.state) ?? (change.state as LoopRow["state"]);
  }

  return {
    weight: clampWeight(loop.weight + weightDelta),
    emotionalIntensity: clampEmotionalIntensity(loop.emotionalIntensity + eiDelta),
    mentionCount: Math.max(1, (loop.mentionCount ?? 1) + mentionDelta),
    nextStep:
      change.next_step !== undefined && change.next_step !== null
        ? change.next_step
        : loop.nextStep,
    state,
  };
}
