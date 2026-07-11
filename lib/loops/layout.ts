import {
  forceSimulation,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";
import type { LoopState } from "./state";
import { loopVisualStyle } from "./state";
import { gravityZoneForState, type GravityZone } from "./gravity";
import type { LabelPosition } from "./layout-types";

export const FIELD_VISIBLE_CAP = 14;
export const LABEL_CHAR_PX = 7;
export const COLLIDE_PADDING = 10;
export const VIEWPORT_MARGIN = 18;

export interface LayoutLoop {
  id: string;
  state: LoopState;
  weight: number;
  emotionalIntensity: number;
  label?: string;
  visualSeed?: number;
}

export interface LayoutPosition {
  id: string;
  x: number;
  y: number;
  labelPosition: LabelPosition;
}

export interface LayoutOptions {
  width: number;
  height: number;
  visibleCount?: number;
  leftInset?: number;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  state: LoopState;
  weight: number;
  emotionalIntensity: number;
  label: string;
  visualSeed: number;
  circleRadius: number;
  collideRadius: number;
  labelWidth: number;
  labelHeight: number;
  labelPosition: LabelPosition;
  targetX: number;
  targetY: number;
}

const ZONE_Y: Record<GravityZone, number> = {
  ready: 0.17,
  clarify: 0.5,
  waiting: 0.83,
};

function hashSeed(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index++) {
    hash = (hash << 5) - hash + id.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function loopPriority(state: LoopState, weight: number): number {
  const order: Record<LoopState, number> = {
    next_step_known: 0,
    open_attention: 1,
    parked: 2,
    released: 3,
    done: 4,
  };
  return order[state] * 10 - weight;
}

export function fieldLayoutCircleSize(
  item: Pick<LayoutLoop, "state" | "weight" | "emotionalIntensity">,
  width: number,
  visibleCount: number
): number {
  const visual = loopVisualStyle(item.state, item.weight, item.emotionalIntensity, {
    visibleCount,
    forField: true,
  });
  if (width < 480) return Math.max(32, Math.min(58, visual.size * 0.65));
  return Math.min(112, visual.size);
}

/** Split loops into visible field set + collapsed cluster when above cap. */
export function partitionFieldLoops<T extends LayoutLoop & { label?: string }>(
  loops: T[],
  expanded: boolean
): { visible: T[]; collapsed: T[] } {
  if (loops.length <= FIELD_VISIBLE_CAP || expanded) {
    return { visible: loops, collapsed: [] };
  }

  const sorted = [...loops].sort(
    (a, b) => loopPriority(a.state, a.weight) - loopPriority(b.state, b.weight)
  );

  return {
    visible: sorted.slice(0, FIELD_VISIBLE_CAP),
    collapsed: sorted.slice(FIELD_VISIBLE_CAP),
  };
}

function labelBox(node: SimNode, position: LabelPosition) {
  const labelY =
    position === "above"
      ? (node.y ?? 0) - node.circleRadius - 5 - node.labelHeight
      : (node.y ?? 0) + node.circleRadius + 5;
  return {
    left: (node.x ?? 0) - node.labelWidth / 2,
    right: (node.x ?? 0) + node.labelWidth / 2,
    top: labelY,
    bottom: labelY + node.labelHeight,
  };
}

function boxesOverlap(
  a: ReturnType<typeof labelBox>,
  b: ReturnType<typeof labelBox>,
  gap = 4
): boolean {
  return !(
    a.right + gap < b.left ||
    a.left - gap > b.right ||
    a.bottom + gap < b.top ||
    a.top - gap > b.bottom
  );
}

function nudgeLabels(nodes: SimNode[]): void {
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (let first = 0; first < nodes.length; first++) {
      for (let second = first + 1; second < nodes.length; second++) {
        const a = nodes[first];
        const b = nodes[second];
        if (!boxesOverlap(labelBox(a, a.labelPosition), labelBox(b, b.labelPosition))) {
          continue;
        }
        const victim =
          loopPriority(a.state, a.weight) > loopPriority(b.state, b.weight) ? a : b;
        const nextPosition = victim.labelPosition === "below" ? "above" : "below";
        if (nextPosition !== victim.labelPosition) {
          victim.labelPosition = nextPosition;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

function keepNodesInView(
  nodes: SimNode[],
  width: number,
  height: number,
  leftInset: number
): void {
  for (const node of nodes) {
    const horizontalExtent = Math.max(node.circleRadius, node.labelWidth / 2);
    const labelOffset = node.circleRadius + 5 + node.labelHeight;
    const topExtent = node.labelPosition === "above" ? labelOffset : node.circleRadius;
    const bottomExtent = node.labelPosition === "below" ? labelOffset : node.circleRadius;
    const minX = leftInset + VIEWPORT_MARGIN + horizontalExtent;
    const maxX = width - VIEWPORT_MARGIN - horizontalExtent;
    const minY = VIEWPORT_MARGIN + topExtent;
    const maxY = height - VIEWPORT_MARGIN - bottomExtent;

    node.x = minX > maxX ? (leftInset + width) / 2 : Math.max(minX, Math.min(maxX, node.x ?? minX));
    node.y = minY > maxY ? height / 2 : Math.max(minY, Math.min(maxY, node.y ?? minY));
  }
}

export function computeLoopLayout(
  items: LayoutLoop[],
  width: number,
  height: number,
  options?: Partial<LayoutOptions>
): LayoutPosition[] {
  if (items.length === 0) return [];

  const visibleCount = options?.visibleCount ?? items.length;
  const leftInset = Math.max(0, options?.leftInset ?? 0);
  const compact = width < 480;
  const labelHeight = compact ? 32 : 20;
  const maxLabelWidth = compact ? 96 : 170;
  const availableLeft = leftInset + VIEWPORT_MARGIN;
  const availableRight = width - VIEWPORT_MARGIN;
  const availableWidth = Math.max(120, availableRight - availableLeft);

  const grouped = new Map<GravityZone, LayoutLoop[]>();
  for (const item of items) {
    const zone = gravityZoneForState(item.state);
    const group = grouped.get(zone) ?? [];
    group.push(item);
    grouped.set(zone, group);
  }
  grouped.forEach((group) => group.sort((a, b) => loopPriority(a.state, a.weight) - loopPriority(b.state, b.weight)));

  const nodes: SimNode[] = items.map((item) => {
    const zone = gravityZoneForState(item.state);
    const group = grouped.get(zone) ?? [item];
    const groupIndex = Math.max(0, group.findIndex((candidate) => candidate.id === item.id));
    const slot = (groupIndex + 1) / (group.length + 1);
    const seed = item.visualSeed ?? hashSeed(item.id);
    const circleSize = fieldLayoutCircleSize(item, width, visibleCount);
    const label = item.label ?? "";
    const jitterX = ((seed % 13) - 6) * (compact ? 1.2 : 2.2);
    const jitterY = (((seed >> 3) % 9) - 4) * (compact ? 1.5 : 2.5);
    const targetX = availableLeft + slot * availableWidth + jitterX;
    const targetY = height * ZONE_Y[zone] + jitterY;
    const measuredLabelWidth = Math.max(54, label.length * LABEL_CHAR_PX + 8);

    return {
      id: item.id,
      state: item.state,
      weight: item.weight,
      emotionalIntensity: item.emotionalIntensity,
      label,
      visualSeed: seed,
      circleRadius: circleSize / 2,
      collideRadius: circleSize / 2 + labelHeight + COLLIDE_PADDING,
      labelWidth: Math.min(maxLabelWidth, measuredLabelWidth),
      labelHeight,
      labelPosition: groupIndex % 2 === 0 ? "below" : "above",
      targetX,
      targetY,
      x: targetX,
      y: targetY,
    };
  });

  const simulation = forceSimulation(nodes)
    .force("charge", forceManyBody<SimNode>().strength(compact ? -45 : -75))
    .force(
      "collide",
      forceCollide<SimNode>()
        .radius((node) => node.collideRadius)
        .strength(1)
        .iterations(5)
    )
    .force("x", forceX<SimNode>().x((node) => node.targetX).strength(0.3))
    .force("y", forceY<SimNode>().y((node) => node.targetY).strength(0.5))
    .alpha(1)
    .alphaDecay(0.025)
    .stop();

  for (let ticks = 0; simulation.alpha() > 0.005 && ticks < 360; ticks++) {
    simulation.tick();
  }

  nudgeLabels(nodes);
  keepNodesInView(nodes, width, height, leftInset);

  return nodes.map((node) => ({
    id: node.id,
    x: node.x ?? node.targetX,
    y: node.y ?? node.targetY,
    labelPosition: node.labelPosition,
  }));
}

export function summariseLoops(loops: { state: LoopState }[]) {
  const openAttention = loops.filter((loop) => loop.state === "open_attention").length;
  const nextStepKnown = loops.filter((loop) => loop.state === "next_step_known").length;
  const parked = loops.filter((loop) => loop.state === "parked").length;
  const parts: string[] = [];
  if (openAttention > 0) parts.push(`${openAttention} need attention`);
  if (nextStepKnown > 0) parts.push(`${nextStepKnown} have a next step`);
  if (parked > 0) parts.push(`${parked} waiting`);
  return parts.length > 0 ? parts.join(" · ") : "Nothing occupying you right now";
}
