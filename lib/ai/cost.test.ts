import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateTranscriptionCostUsd } from "./cost";

describe("AI cost estimates", () => {
  it("scales transcription cost with duration", () => {
    const short = estimateTranscriptionCostUsd(30);
    const long = estimateTranscriptionCostUsd(300);
    assert.ok(long > short);
    assert.ok(short > 0);
  });
});
