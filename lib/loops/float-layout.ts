import {
  forceCollide,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";
import { gravityZoneForState, type GravityZone } from "./gravity";
import {
  fieldLabelMaxWidth,
  fieldLayoutCircleSize,
  type LayoutLoop,
  type LayoutPosition,
} from "./layout";

interface FloatNode extends SimulationNodeDatum {
  id: string;
  zone: GravityZone;
  anchorX: number;
  anchorY: number;
  radius: number;
}

const ZONE_INDEX: Record<GravityZone, number> = {
  ready: 0,
  clarify: 1,
  waiting: 2,
};

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Settles loops with deterministic repulsion while retaining their gravity
 * lane and seeded fixed position as an anchor.
 */
export function computeSettledLoopLayout(
  items: LayoutLoop[],
  fixedPositions: LayoutPosition[],
  width: number,
  height: number,
  options: { leftInset: number; visibleCount: number }
): LayoutPosition[] {
  if (items.length === 0) return [];

  const fixedById = new Map(fixedPositions.map((position) => [position.id, position]));
  const labelWidth = fieldLabelMaxWidth(width);
  const compact = width < 640;
  const gutter = compact ? 16 : width < 1024 ? 32 : 48;
  const contentLeft = options.leftInset + gutter;
  const contentRight = width - gutter;
  const laneHeight = height / 3;

  const nodes: FloatNode[] = items.map((item) => {
    const fixed = fixedById.get(item.id) ?? {
      id: item.id,
      x: (contentLeft + contentRight) / 2,
      y: laneHeight * (ZONE_INDEX[gravityZoneForState(item.state)] + 0.5),
      labelPosition: "below" as const,
    };
    const circleSize = fieldLayoutCircleSize(item, width, options.visibleCount);
    const contentHeight = circleSize + 4 + (compact ? 28 : 24);
    const radius = Math.max(circleSize, labelWidth, contentHeight) / 2 + 10;

    return {
      id: item.id,
      zone: gravityZoneForState(item.state),
      anchorX: fixed.x,
      anchorY: fixed.y,
      radius,
      x: fixed.x,
      y: fixed.y,
    };
  });

  const simulation = forceSimulation(nodes)
    .randomSource(seededRandom(items.reduce((sum, item) => sum ^ (item.visualSeed ?? 0), 0x91e10da5)))
    .alpha(0.8)
    .alphaDecay(0.055)
    .velocityDecay(0.45)
    .force("x", forceX<FloatNode>((node) => node.anchorX).strength(0.09))
    .force("y", forceY<FloatNode>((node) => node.anchorY).strength(0.12))
    .force("charge", forceManyBody<FloatNode>().strength(compact ? -16 : -28))
    .force("collide", forceCollide<FloatNode>((node) => node.radius).strength(0.92).iterations(2))
    .stop();

  for (let tick = 0; tick < 90; tick++) simulation.tick();

  return nodes.map((node) => {
    const zoneTop = ZONE_INDEX[node.zone] * laneHeight;
    const zoneBottom = zoneTop + laneHeight;
    const safeRadius = Math.min(node.radius, laneHeight / 2 - 6);
    return {
      id: node.id,
      x: Math.max(contentLeft + safeRadius, Math.min(contentRight - safeRadius, node.x ?? node.anchorX)),
      y: Math.max(zoneTop + safeRadius, Math.min(zoneBottom - safeRadius, node.y ?? node.anchorY)),
      labelPosition: fixedById.get(node.id)?.labelPosition ?? "below",
    };
  });
}
