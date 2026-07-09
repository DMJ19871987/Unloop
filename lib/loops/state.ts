export type LoopState =
  | "open_attention"
  | "next_step_known"
  | "parked"
  | "released"
  | "done";

const ALLOWED_TRANSITIONS: Record<LoopState, LoopState[]> = {
  open_attention: ["next_step_known", "parked", "released", "done"],
  next_step_known: ["done", "released", "parked", "open_attention"],
  parked: ["open_attention", "released", "done"],
  released: [],
  done: [],
};

export function canTransition(from: LoopState, to: LoopState): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(state: LoopState): boolean {
  return state === "released" || state === "done";
}

export function arcCompleteness(
  state: LoopState,
  weight: number,
  visualSeed: number
): number {
  switch (state) {
    case "open_attention": {
      const jitter = ((visualSeed % 100) / 100) * 0.3;
      return 0.15 + jitter + (weight / 5) * 0.1;
    }
    case "next_step_known":
      return 0.75;
    case "parked":
      return 0.3;
    case "released":
    case "done":
      return 1.0;
    default:
      return 0.4;
  }
}

export function visualSeedFromLabel(label: string, userId: string): number {
  const input = `${label}:${userId}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export interface LoopVisualStyle {
  stroke: string;
  strokeWidth: number;
  opacity: number;
  size: number;
}

export function loopVisualStyle(
  state: LoopState,
  weight: number,
  emotionalIntensity: number
): LoopVisualStyle {
  const baseSize = 46 + weight * 20 + emotionalIntensity * 2;

  switch (state) {
    case "open_attention":
      return {
        stroke: "var(--accent)",
        strokeWidth: 4 + (emotionalIntensity > 3 ? 0.5 : 0),
        opacity: 1,
        size: Math.min(150, baseSize),
      };
    case "next_step_known":
      return {
        stroke: "var(--closed)",
        strokeWidth: 3,
        opacity: 0.9,
        size: Math.min(120, baseSize - 10),
      };
    case "parked":
      return {
        stroke: "var(--ink-placeholder)",
        strokeWidth: 2,
        opacity: 0.4,
        size: Math.max(46, baseSize - 30),
      };
    case "released":
    case "done":
      return {
        stroke: "var(--closed)",
        strokeWidth: 2,
        opacity: 0.6,
        size: Math.max(46, baseSize - 20),
      };
    default:
      return {
        stroke: "var(--accent)",
        strokeWidth: 4,
        opacity: 1,
        size: baseSize,
      };
  }
}
