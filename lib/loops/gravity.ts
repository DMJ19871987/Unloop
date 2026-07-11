import type { LoopState } from "./state";

export type GravityZone = "ready" | "clarify" | "waiting";

export const GRAVITY_ZONES: Array<{
  id: GravityZone;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: "ready",
    label: "Ready to move",
    shortLabel: "Ready",
    description: "A next step is known",
  },
  {
    id: "clarify",
    label: "Needs clarity",
    shortLabel: "Clarify",
    description: "Still asking for attention",
  },
  {
    id: "waiting",
    label: "Waiting",
    shortLabel: "Waiting",
    description: "Parked or outside your control",
  },
];

export function gravityZoneForState(state: LoopState): GravityZone {
  if (state === "next_step_known") return "ready";
  if (state === "parked") return "waiting";
  return "clarify";
}

export function stateForGravityZone(zone: GravityZone): LoopState {
  if (zone === "ready") return "next_step_known";
  if (zone === "waiting") return "parked";
  return "open_attention";
}
