import type { ExistingLoopContext, ExtractionModelOutput } from "./extraction-types";

/** Acceptance case 1 — auto-apply match, no proposals. */
export const MOCK_TRANSCRIPT_CASE_1 =
  "still stressed about the job application, but I sent the follow-up email";

/** Acceptance case 2 — close proposal, not silent done. */
export const MOCK_TRANSCRIPT_CASE_2 = "I got the job, so that's sorted";

/** Acceptance case 3 — venting, no release/close. */
export const MOCK_TRANSCRIPT_CASE_3 =
  "ugh I should just forget the whole job thing";

/** Crisis fixture — trips flag: "crisis", zero loops. */
export const MOCK_TRANSCRIPT_CRISIS =
  "I've been thinking about hurting myself and I don't know what to do";

/** Clear-head fixture — zero new loops, zero matches → clear-head interstitial. */
export const MOCK_TRANSCRIPT_CLEAR =
  "today was actually fine";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function findJobLoop(existing: ExistingLoopContext[]): ExistingLoopContext | undefined {
  return existing.find(
    (l) =>
      l.id === "d-01" ||
      normalize(l.label).includes("job application") ||
      (l.category === "work" && normalize(l.label).includes("job"))
  );
}

function isCrisisTranscript(transcript: string): boolean {
  const norm = normalize(transcript);
  if (norm === normalize(MOCK_TRANSCRIPT_CRISIS)) return true;
  const crisisPhrases = [
    "hurt myself",
    "kill myself",
    "want to die",
    "end my life",
    "suicide",
    "self harm",
    "self-harm",
  ];
  return crisisPhrases.some((p) => norm.includes(p.replace(/-/g, " ")));
}

export function mockExtractLoops(
  transcript: string,
  existingLoops: ExistingLoopContext[]
): ExtractionModelOutput {
  if (isCrisisTranscript(transcript)) {
    return {
      new_loops: [],
      matched_loops: [],
      merge_suggestions: [],
      flag: "crisis",
    };
  }

  const norm = normalize(transcript);

  if (norm === normalize(MOCK_TRANSCRIPT_CLEAR)) {
    return {
      new_loops: [],
      matched_loops: [],
      merge_suggestions: [],
      flag: null,
    };
  }

  const jobLoop = findJobLoop(existingLoops);

  if (jobLoop && norm === normalize(MOCK_TRANSCRIPT_CASE_1)) {
    return {
      new_loops: [],
      matched_loops: [
        {
          loop_id: jobLoop.id,
          mention_count_delta: 1,
          weight_delta: 0,
          emotional_intensity_delta: -1,
          next_step: "Sent the follow-up email",
          state_suggestion: "next_step_known",
          confidence: 0.92,
          evidence: "I sent the follow-up email",
        },
      ],
      merge_suggestions: [],
      flag: null,
    };
  }

  if (jobLoop && norm === normalize(MOCK_TRANSCRIPT_CASE_2)) {
    return {
      new_loops: [],
      matched_loops: [
        {
          loop_id: jobLoop.id,
          mention_count_delta: 1,
          weight_delta: -1,
          emotional_intensity_delta: -2,
          next_step: null,
          state_suggestion: "done",
          confidence: 0.88,
          evidence: "I got the job, so that's sorted",
        },
      ],
      merge_suggestions: [],
      flag: null,
    };
  }

  if (jobLoop && norm === normalize(MOCK_TRANSCRIPT_CASE_3)) {
    return {
      new_loops: [],
      matched_loops: [
        {
          loop_id: jobLoop.id,
          mention_count_delta: 1,
          weight_delta: -1,
          emotional_intensity_delta: -1,
          next_step: null,
          state_suggestion: null,
          confidence: 0.75,
          evidence: "ugh I should just forget the whole job thing",
        },
      ],
      merge_suggestions: [],
      flag: null,
    };
  }

  return {
    new_loops: [
      {
        label: "the garden",
        weight: 3,
        emotional_intensity: 2,
        category: "home",
        next_step: null,
      },
    ],
    matched_loops: [],
    merge_suggestions: [],
    flag: null,
  };
}
