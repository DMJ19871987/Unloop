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
    assert.ok(size <= 44);
    assert.ok(size >= 30);
  });

  it("keeps every slot inside its lane across desktop resizes", () => {
    const loops = [
      { id: "r1", state: "next_step_known" as const, weight: 5, emotionalIntensity: 3 },
      { id: "r2", state: "next_step_known" as const, weight: 2, emotionalIntensity: 1 },
      { id: "c1", state: "open_attention" as const, weight: 4, emotionalIntensity: 4 },
      { id: "c2", state: "open_attention" as const, weight: 2, emotionalIntensity: 2 },
      { id: "w1", state: "parked" as const, weight: 3, emotionalIntensity: 2 },
    ];

    for (const width of [720, 1180, 1600]) {
      const height = 720;
      const layout = computeLoopLayout(loops, width, height);
      const byId = new Map(layout.map((position) => [position.id, position]));

      for (const position of layout) {
        assert.ok(position.x > 0 && position.x < width);
      }
      if (width >= 1180) {
        assert.ok(Math.min(...layout.map((position) => position.x)) > 240);
        assert.ok(Math.max(...layout.map((position) => position.x)) < width - 80);
      }
      assert.ok(byId.get("r1")!.y < height / 3);
      assert.ok(byId.get("r2")!.y < height / 3);
      assert.ok(byId.get("c1")!.y >= height / 3 && byId.get("c1")!.y < (height * 2) / 3);
      assert.ok(byId.get("c2")!.y >= height / 3 && byId.get("c2")!.y < (height * 2) / 3);
      assert.ok(byId.get("w1")!.y >= (height * 2) / 3);
    }
  });

  it("returns identical slots for identical dimensions", () => {
    const loops = [
      { id: "a", state: "open_attention" as const, weight: 3, emotionalIntensity: 2 },
      { id: "b", state: "open_attention" as const, weight: 2, emotionalIntensity: 1 },
    ];
    assert.deepEqual(
      computeLoopLayout(loops, 1280, 720),
      computeLoopLayout(loops, 1280, 720)
    );
  });
});
