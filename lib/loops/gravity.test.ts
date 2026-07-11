import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gravityZoneForState,
  stateForGravityZone,
} from "./gravity";
import { loopVisualStyle } from "./state";
import {
  computeLoopLayout,
  fieldLayoutCircleSize,
  selectVisibleFieldLoops,
} from "./layout";
import { computeSettledLoopLayout } from "./float-layout";

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

  it("makes emotional intensity visibly strengthen active strokes", () => {
    const quiet = loopVisualStyle("open_attention", 3, 1, { forField: true });
    const intense = loopVisualStyle("open_attention", 3, 5, { forField: true });
    assert.ok(intense.strokeWidth - quiet.strokeWidth >= 2.5);
    assert.equal(intense.size, quiet.size);
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

  it("adds deterministic asymmetry to equal-sized lane groups", () => {
    const loops = [
      { id: "r1", state: "next_step_known" as const, weight: 3, emotionalIntensity: 2, visualSeed: 11 },
      { id: "r2", state: "next_step_known" as const, weight: 3, emotionalIntensity: 2, visualSeed: 22 },
      { id: "c1", state: "open_attention" as const, weight: 3, emotionalIntensity: 2, visualSeed: 33 },
      { id: "c2", state: "open_attention" as const, weight: 3, emotionalIntensity: 2, visualSeed: 44 },
      { id: "w1", state: "parked" as const, weight: 3, emotionalIntensity: 2, visualSeed: 55 },
      { id: "w2", state: "parked" as const, weight: 3, emotionalIntensity: 2, visualSeed: 66 },
    ];
    const first = computeLoopLayout(loops, 1440, 720);
    const second = computeLoopLayout(loops, 1440, 720);
    const byId = new Map(first.map((position) => [position.id, position]));

    assert.deepEqual(first, second);
    assert.notEqual(byId.get("r1")!.x, byId.get("c1")!.x);
    assert.notEqual(byId.get("r2")!.y % 240, byId.get("w2")!.y % 240);
  });

  it("keeps force-settled loops inside their gravity lanes", () => {
    const loops = [
      { id: "r1", state: "next_step_known" as const, weight: 5, emotionalIntensity: 4, visualSeed: 11 },
      { id: "r2", state: "next_step_known" as const, weight: 3, emotionalIntensity: 2, visualSeed: 22 },
      { id: "c1", state: "open_attention" as const, weight: 4, emotionalIntensity: 4, visualSeed: 33 },
      { id: "c2", state: "open_attention" as const, weight: 2, emotionalIntensity: 2, visualSeed: 44 },
      { id: "w1", state: "parked" as const, weight: 3, emotionalIntensity: 2, visualSeed: 55 },
      { id: "w2", state: "parked" as const, weight: 2, emotionalIntensity: 1, visualSeed: 66 },
    ];
    const width = 1280;
    const height = 720;
    const leftInset = 168;
    const fixed = computeLoopLayout(loops, width, height, { leftInset });
    const floating = computeSettledLoopLayout(loops, fixed, width, height, {
      leftInset,
      visibleCount: loops.length,
    });
    const repeated = computeSettledLoopLayout(loops, fixed, width, height, {
      leftInset,
      visibleCount: loops.length,
    });

    assert.deepEqual(floating, repeated);
    for (const position of floating) {
      const loop = loops.find((item) => item.id === position.id)!;
      const zone = gravityZoneForState(loop.state);
      const zoneIndex = zone === "ready" ? 0 : zone === "clarify" ? 1 : 2;
      assert.ok(position.y >= zoneIndex * (height / 3));
      assert.ok(position.y <= (zoneIndex + 1) * (height / 3));
      assert.ok(position.x > leftInset && position.x < width);
    }
  });

  it("keeps dense mobile loops clear of their lane boundaries", () => {
    const loops = Array.from({ length: 4 }, (_, index) => ({
      id: `clarify-${index}`,
      state: "open_attention" as const,
      weight: 4,
      emotionalIntensity: 3,
    }));
    const width = 390;
    const height = 570;
    const laneTop = height / 3;
    const layout = computeLoopLayout(loops, width, height, { visibleCount: 4 });
    const contentHeight =
      fieldLayoutCircleSize(loops[0], width, loops.length) + 4 + 28;

    for (const position of layout) {
      assert.ok(position.y - contentHeight / 2 >= laneTop + 4);
      assert.ok(position.y + contentHeight / 2 <= (height * 2) / 3 - 4);
    }
  });

  it("caps each mobile lane without hiding the preferred moved loop", () => {
    const loops = Array.from({ length: 10 }, (_, index) => ({
      id: `clarify-${index}`,
      state: "open_attention" as const,
      weight: index === 9 ? 1 : 4,
      emotionalIntensity: 2,
      visualSeed: index,
    }));
    const result = selectVisibleFieldLoops(loops, {
      perZoneCap: 4,
      totalCap: 12,
      preferredId: "clarify-9",
    });

    assert.equal(result.visible.length, 4);
    assert.equal(result.collapsed.length, 6);
    assert.ok(result.visible.some((loop) => loop.id === "clarify-9"));
  });
});
