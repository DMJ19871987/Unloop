import {
  forceSimulation,
  forceManyBody,
  forceCollide,
  forceCenter,
  type SimulationNodeDatum,
} from "d3-force";
import type { LoopState } from "./state";
import { loopVisualStyle } from "./state";

export interface LayoutLoop {
  id: string;
  state: LoopState;
  weight: number;
  emotionalIntensity: number;
}

export interface LayoutPosition {
  id: string;
  x: number;
  y: number;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  state: LoopState;
  weight: number;
  emotionalIntensity: number;
  radius: number;
}

function targetRadius(state: LoopState, weight: number, emotionalIntensity: number): number {
  const { size } = loopVisualStyle(state, weight, emotionalIntensity);
  switch (state) {
    case "open_attention":
      return size * 0.15 * (weight * emotionalIntensity) / 8;
    case "next_step_known":
      return size * 0.22;
    case "parked":
      return size * 0.38;
    default:
      return size * 0.2;
  }
}

export function computeLoopLayout(
  items: LayoutLoop[],
  width: number,
  height: number
): LayoutPosition[] {
  if (items.length === 0) return [];

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) * 0.42;

  const nodes: SimNode[] = items.map((item) => {
    const visual = loopVisualStyle(item.state, item.weight, item.emotionalIntensity);
    return {
      id: item.id,
      state: item.state,
      weight: item.weight,
      emotionalIntensity: item.emotionalIntensity,
      radius: visual.size / 2 + 20,
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 40,
    };
  });

  const sim = forceSimulation(nodes)
    .force("charge", forceManyBody().strength(-120))
    .force(
      "collide",
      forceCollide<SimNode>().radius((d) => d.radius).strength(0.9)
    )
    .force("center", forceCenter(cx, cy).strength(0.05))
    .stop();

  for (let i = 0; i < 300; i++) {
    nodes.forEach((node) => {
      const tr = targetRadius(node.state, node.weight, node.emotionalIntensity);
      const dx = (node.x ?? cx) - cx;
      const dy = (node.y ?? cy) - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDist = tr * maxR;
      const pull = (dist - targetDist) * 0.02;
      node.vx = (node.vx ?? 0) - (dx / dist) * pull;
      node.vy = (node.vy ?? 0) - (dy / dist) * pull;
    });
    sim.tick();
  }

  return nodes.map((n) => ({
    id: n.id,
    x: Math.max(60, Math.min(width - 60, n.x ?? cx)),
    y: Math.max(80, Math.min(height - 80, n.y ?? cy)),
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
