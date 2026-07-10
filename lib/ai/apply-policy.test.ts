import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { loops } from "@/lib/db/schema";
import { applyPolicy, previewAppliedValues } from "./apply-policy";
import type { ExtractionModelOutput } from "./extraction-types";

type LoopRow = typeof loops.$inferSelect;

function mockLoop(overrides: Partial<LoopRow> & { id: string; label: string }): LoopRow {
  return {
    id: overrides.id,
    userId: "user-1",
    label: overrides.label,
    state: overrides.state ?? "open_attention",
    category: overrides.category ?? "other",
    weight: overrides.weight ?? 3,
    emotionalIntensity: overrides.emotionalIntensity ?? 3,
    nextStep: overrides.nextStep ?? null,
    mentionCount: overrides.mentionCount ?? 1,
    visualSeed: overrides.visualSeed ?? 1,
    resurfaceAfter: null,
    firstSessionId: null,
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function extraction(overrides: Partial<ExtractionModelOutput>): ExtractionModelOutput {
  return {
    new_loops: [],
    matched_loops: [],
    merge_suggestions: [],
    flag: null,
    ...overrides,
  };
}

describe("applyPolicy", () => {
  const jobLoop = mockLoop({
    id: "loop-job",
    label: "Job application",
    state: "open_attention",
    weight: 4,
    emotionalIntensity: 5,
  });

  it("safety guarantee: destructive states and merges never auto-apply", () => {
    const other = mockLoop({ id: "loop-other", label: "Other thing" });

    for (const suggestion of ["done", "released", "parked"] as const) {
      const result = applyPolicy(
        extraction({
          matched_loops: [
            {
              loop_id: jobLoop.id,
              mention_count_delta: 1,
              weight_delta: 1,
              emotional_intensity_delta: -1,
              next_step: "A step",
              state_suggestion: suggestion,
              confidence: 0.9,
              evidence: "test",
            },
          ],
        }),
        [jobLoop]
      );

      assert.equal(
        result.applied.find((a) => a.state !== undefined),
        undefined,
        `${suggestion}: no destructive state auto-applied`
      );
      assert.ok(result.proposals.length >= 1, `${suggestion}: proposal created`);
      assert.equal(
        result.applied.some((a) => a.weight_delta !== 0 || a.next_step !== null),
        true,
        `${suggestion}: non-destructive deltas may still auto-apply`
      );
    }

    const mergeResult = applyPolicy(
      extraction({
        merge_suggestions: [
          {
            source_loop_id: other.id,
            target_loop_id: jobLoop.id,
            confidence: 0.85,
            evidence: "same worry",
          },
        ],
      }),
      [jobLoop, other]
    );

    assert.equal(mergeResult.applied.length, 0);
    assert.equal(mergeResult.proposals.length, 1);
    assert.equal(mergeResult.proposals[0].kind, "merge");
  });

  it("safety guarantee: low confidence turns whole match into proposal — no auto weight/EI/next_step", () => {
    const result = applyPolicy(
      extraction({
        matched_loops: [
          {
            loop_id: jobLoop.id,
            mention_count_delta: 1,
            weight_delta: 1,
            emotional_intensity_delta: -1,
            next_step: "Call them",
            state_suggestion: "next_step_known",
            confidence: 0.4,
            evidence: "maybe",
          },
        ],
      }),
      [jobLoop]
    );

    assert.equal(result.applied.length, 0);
    assert.equal(result.proposals.length, 1);
    assert.equal(result.proposals[0].kind, "low_confidence_match");
    assert.equal(result.proposals[0].change.weight_delta, 1);
    assert.equal(result.proposals[0].change.emotional_intensity_delta, -1);
    assert.equal(result.proposals[0].change.next_step, "Call them");
    assert.equal(result.proposals[0].change.state, "next_step_known");
  });

  it("auto-applies small deltas and proposes large ones", () => {
    const result = applyPolicy(
      extraction({
        matched_loops: [
          {
            loop_id: jobLoop.id,
            mention_count_delta: 1,
            weight_delta: 2,
            emotional_intensity_delta: 2,
            next_step: "Big step",
            state_suggestion: null,
            confidence: 0.95,
            evidence: "spike",
          },
        ],
      }),
      [jobLoop]
    );

    assert.equal(result.applied.length, 1);
    assert.equal(result.applied[0].weight_delta, 0);
    assert.equal(result.applied[0].emotional_intensity_delta, 0);
    assert.equal(result.applied[0].next_step, "Big step");
    assert.ok(result.proposals.some((p) => p.kind === "big_weight"));
    assert.ok(result.proposals.some((p) => p.kind === "big_intensity"));
  });

  it("auto-applies weight +1 and EI ±1", () => {
    const result = applyPolicy(
      extraction({
        matched_loops: [
          {
            loop_id: jobLoop.id,
            mention_count_delta: 1,
            weight_delta: 1,
            emotional_intensity_delta: -1,
            next_step: null,
            state_suggestion: null,
            confidence: 0.9,
            evidence: "softening",
          },
        ],
      }),
      [jobLoop]
    );

    assert.equal(result.applied.length, 1);
    assert.equal(result.applied[0].weight_delta, 1);
    assert.equal(result.applied[0].emotional_intensity_delta, -1);
    assert.equal(result.proposals.length, 0);
  });

  it("clamps weight and emotional intensity to 1–5", () => {
    const heavy = mockLoop({
      id: "loop-heavy",
      label: "Heavy",
      weight: 5,
      emotionalIntensity: 5,
    });

    const preview = previewAppliedValues(heavy, {
      weight_delta: 2,
      emotional_intensity_delta: 2,
    });

    assert.equal(preview.weight, 5);
    assert.equal(preview.emotionalIntensity, 5);
  });

  it("never decreases mention_count below 1", () => {
    const preview = previewAppliedValues(jobLoop, { mention_count_delta: -3 });
    assert.equal(preview.mentionCount, 1);
  });

  it("maps API state open to open_attention on write preview", () => {
    const preview = previewAppliedValues(jobLoop, { state: "open" as never });
    assert.equal(preview.state, "open_attention");
  });
});
