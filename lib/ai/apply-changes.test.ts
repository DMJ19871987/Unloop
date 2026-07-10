import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeChangeForWrite } from "./apply-changes";

describe("normalizeChangeForWrite", () => {
  it("maps API state open to open_attention for DB mutation", () => {
    const result = normalizeChangeForWrite({ state: "open" as never });
    assert.equal(result.state, "open_attention");
  });

  it("passes through DB enum states unchanged", () => {
    const result = normalizeChangeForWrite({ state: "next_step_known" });
    assert.equal(result.state, "next_step_known");
  });

  it("leaves changes without state untouched", () => {
    const result = normalizeChangeForWrite({ weight_delta: 1 });
    assert.equal("state" in result ? result.state : undefined, undefined);
  });
});
