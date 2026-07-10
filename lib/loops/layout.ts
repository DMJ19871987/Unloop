import {
  forceSimulation,
  forceManyBody,
  forceCollide,
  forceCenter,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";
import type { LoopState } from "./state";
import { loopVisualStyle } from "./state";
import type { LabelPosition } from "./layout-types";

export const FIELD_VISIBLE_CAP = 14;
export const LABEL_HEIGHT = 20;
export const LABEL_CHAR_PX = 7;
export const COLLIDE_PADDING = 12;
export const VIEWPORT_MARGIN = 32;

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
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  state: LoopState;
  weight: number;
  emotionalIntensity: number;
  label: string;
  visualSeed: number;
  collideRadius: number;
  labelWidth: number;
  labelPosition: LabelPosition;
  targetAngle: number;
  targetNormR: number;
}

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function targetNormRadius(
  state: LoopState,
  weight: number,
  emotionalIntensity: number
): number {
  switch (state) {
    case "open_attention":
      return Math.max(0.06, 0.34 - (weight * emotionalIntensity) / 42);
    case "next_step_known":
      return 0.26;
    case "parked":
      return 0.4;
    default:
      return 0.2;
  }
}

function loopPriority(state: LoopState, weight: number): number {
  const order: Record<LoopState, number> = {
    open_attention: 0,
    next_step_known: 1,
    parked: 4,
    released: 5,
    done: 6,
  };
  return order[state] * 10 - weight;
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

function estimateLabelWidth(label: string): number {
  return Math.max(48, label.length * LABEL_CHAR_PX + 8);
}

function labelBox(
  node: SimNode,
  pos: LabelPosition
): { left: number; right: number; top: number; bottom: number } {
  const r = node.collideRadius - COLLIDE_PADDING - LABEL_HEIGHT;
  const lw = node.labelWidth;
  const lh = LABEL_HEIGHT;

  if (pos === "right") {
    return {
      left: node.x! + r + 4,
      right: node.x! + r + 4 + lw,
      top: node.y! - lh / 2,
      bottom: node.y! + lh / 2,
    };
  }

  const cy = pos === "above" ? node.y! - r - 6 - lh : node.y! + r + 6;
  return {
    left: node.x! - lw / 2,
    right: node.x! + lw / 2,
    top: cy,
    bottom: cy + lh,
  };
}

function boxesOverlap(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
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
  const positions: LabelPosition[] = ["below", "above"];

  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const boxA = labelBox(a, a.labelPosition);
        const boxB = labelBox(b, b.labelPosition);

        if (!boxesOverlap(boxA, boxB)) continue;

        const victim =
          loopPriority(a.state, a.weight) > loopPriority(b.state, b.weight)
            ? a
            : b;
        const currentIdx = positions.indexOf(victim.labelPosition);
        if (currentIdx < positions.length - 1) {
          victim.labelPosition = positions[currentIdx + 1];
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

function keepLabelsInView(nodes: SimNode[], width: number, height: number): void {
  for (const node of nodes) {
    const circleR = node.collideRadius - COLLIDE_PADDING - LABEL_HEIGHT;
    const horizontalExtent = Math.max(circleR, node.labelWidth / 2);
    const labelOffset = circleR + 6 + LABEL_HEIGHT;
    const topExtent = node.labelPosition === "above" ? labelOffset : circleR;
    const bottomExtent = node.labelPosition === "below" ? labelOffset : circleR;

    const minX = VIEWPORT_MARGIN + horizontalExtent;
    const maxX = width - VIEWPORT_MARGIN - horizontalExtent;
    const minY = VIEWPORT_MARGIN + topExtent;
    const maxY = height - VIEWPORT_MARGIN - bottomExtent;

    node.x = minX > maxX ? width / 2 : Math.max(minX, Math.min(maxX, node.x ?? width / 2));
    node.y = minY > maxY ? height / 2 : Math.max(minY, Math.min(maxY, node.y ?? height / 2));
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
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) * 0.42;
  const minX = VIEWPORT_MARGIN;
  const maxX = width - VIEWPORT_MARGIN;
  const minY = VIEWPORT_MARGIN;
  const maxY = height - VIEWPORT_MARGIN;

  const sorted = [...items].sort(
    (a, b) => loopPriority(a.state, a.weight) - loopPriority(b.state, b.weight)
  );
  const angleStep = (Math.PI * 2) / Math.max(items.length, 1);

  const nodes: SimNode[] = items.map((item) => {
    const sortIndex = sorted.findIndex((s) => s.id === item.id);
    const visual = loopVisualStyle(item.state, item.weight, item.emotionalIntensity, {
      visibleCount,
      forField: true,
    });
    const circleR = visual.size / 2;
    const label = item.label ?? "";
    const seed = item.visualSeed ?? hashSeed(item.id);
    const h = hashSeed(item.id);
    const angle = sortIndex * angleStep + ((h % 20) / 20) * 0.15;

    return {
      id: item.id,
      state: item.state,
      weight: item.weight,
      emotionalIntensity: item.emotionalIntensity,
      label,
      visualSeed: seed,
      labelWidth: estimateLabelWidth(label),
      labelPosition: "below" as LabelPosition,
      collideRadius: circleR + LABEL_HEIGHT + COLLIDE_PADDING,
      targetAngle: angle,
      targetNormR: targetNormRadius(item.state, item.weight, item.emotionalIntensity),
      x: cx + Math.cos(angle) * maxR * 0.2,
      y: cy + Math.sin(angle) * maxR * 0.2,
    };
  });

  function targetXY(node: SimNode) {
    const dist = node.targetNormR * maxR;
    return {
      x: cx + Math.cos(node.targetAngle) * dist,
      y: cy + Math.sin(node.targetAngle) * dist,
    };
  }

  const sim = forceSimulation(nodes)
    .force("charge", forceManyBody<SimNode>().strength(-90))
    .force(
      "collide",
      forceCollide<SimNode>()
        .radius((d) => d.collideRadius)
        .strength(0.95)
        .iterations(4)
    )
    .force("x", forceX<SimNode>().x((d) => targetXY(d).x).strength(0.14))
    .force("y", forceY<SimNode>().y((d) => targetXY(d).y).strength(0.14))
    .force("center", forceCenter(cx, cy).strength(0.02))
    .alpha(1)
    .alphaDecay(0.018)
    .stop();

  let ticks = 0;
  while (sim.alpha() > 0.005 && ticks < 500) {
    sim.tick();
    ticks++;
  }

  nodes.forEach((node) => {
    node.x = Math.max(minX, Math.min(maxX, node.x ?? cx));
    node.y = Math.max(minY, Math.min(maxY, node.y ?? cy));
  });

  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = (b.x ?? cx) - (a.x ?? cx);
        const dy = (b.y ?? cy) - (a.y ?? cy);
        const dist = Math.hypot(dx, dy) || 1;
        const minDist = a.collideRadius + b.collideRadius + 16;
        if (dist < minDist) {
          const push = (minDist - dist) / 2;
          a.x = (a.x ?? cx) - (dx / dist) * push;
          a.y = (a.y ?? cy) - (dy / dist) * push;
          b.x = (b.x ?? cx) + (dx / dist) * push;
          b.y = (b.y ?? cy) + (dy / dist) * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
    nodes.forEach((node) => {
      node.x = Math.max(minX, Math.min(maxX, node.x ?? cx));
      node.y = Math.max(minY, Math.min(maxY, node.y ?? cy));
    });
  }

  nudgeLabels(nodes);
  keepLabelsInView(nodes, width, height);

  return nodes.map((n) => ({
    id: n.id,
    x: n.x ?? cx,
    y: n.y ?? cy,
    labelPosition: n.labelPosition,
  }));
}

export function summariseLoops(loops: { state: LoopState }[]) {
  const openAttention = loops.filter((l) => l.state === "open_attention").length;
  const nextStepKnown = loops.filter((l) => l.state === "next_step_known").length;
  const parked = loops.filter((l) => l.state === "parked").length;

  const parts: string[] = [];
  if (openAttention > 0) parts.push(`${openAttention} need attention`);
  if (nextStepKnown > 0) parts.push(`${nextStepKnown} have a next step`);
  if (parked > 0) parts.push(`${parked} parked`);

  return parts.length > 0 ? parts.join(" · ") : "Nothing occupying you right now";
}
