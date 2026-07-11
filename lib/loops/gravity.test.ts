import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gravityZoneForState,
  stateForGravityZone,
} from "./gravity";
import { computeLoopLayout, fieldLayoutCircleSize } from "./layout";

describe("meaningful gravity", () => {
  it("maps active loop states to visible gravity zones", () => {
    assert.equal(gravityZoneForState("next_step_known"), "ready");
    assert.equal(gravityZoneForState("open_attention"), "clarify");
    assert.equal(gravityZoneForState("parked"), "waiting");
    assert.equal(stateForGravityZone("ready"), "next_step_known");
    assert.equal(stateForGravityZone("clarify"), "open_attention");
    assert.equal(stateForGravityZone("waiting"), "parked");
  });

  it("places ready, unclear, and waiting loops in vertical order", () => {
    const layout = computeLoopLayout(
      [
        { id: "ready", state: "next_step_known", weight: 3, emotionalIntensity: 2 },
        { id: "clarify", state: "open_attention", weight: 3, emotionalIntensity: 2 },
        { id: "waiting", state: "parked", weight: 3, emotionalIntensity: 2 },
      ],
      390,
      600,
      { leftInset: 74 }
    );
    const byId = new Map(layout.map((position) => [position.id, position]));

    assert.ok(byId.get("ready")!.y < byId.get("clarify")!.y);
    assert.ok(byId.get("clarify")!.y < byId.get("waiting")!.y);
  });

  it("caps loop circles for a compact mobile field", () => {
    const size = fieldLayoutCircleSize(
      { state: "open_attention", weight: 5, emotionalIntensity: 5 },
      390,
      8
    );
    assert.ok(size <= 58);
    assert.ok(size >= 32);
  });
});
