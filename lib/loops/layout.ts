import type { LoopState } from "./state";
import { loopVisualStyle } from "./state";
import { gravityZoneForState, type GravityZone } from "./gravity";
import type { LabelPosition } from "./layout-types";

export const FIELD_VISIBLE_CAP = 14;
export const VIEWPORT_MARGIN = 16;

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
  slotMinWidth?: number;
}

const GRAVITY_ORDER: GravityZone[] = ["ready", "clarify", "waiting"];

function seededUnit(item: LayoutLoop, salt: number): number {
  let hash = (item.visualSeed ?? 0) ^ salt;
  for (let index = 0; index < item.id.length; index++) {
    hash = Math.imul(hash ^ item.id.charCodeAt(index), 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967295;
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

export function fieldRailWidth(width: number): number {
  if (width < 640) return 84;
  if (width < 1024) return 128;
  return 168;
}

export function fieldLabelMaxWidth(width: number): number {
  if (width < 640) return 96;
  if (width < 1024) return 140;
  return 180;
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
  const densityScale = visibleCount > 10 ? 0.86 : 1;

  if (width < 640) {
    return Math.max(30, Math.min(44, visual.size * 0.55 * densityScale));
  }
  if (width < 1024) {
    return Math.max(34, Math.min(72, visual.size * 0.78 * densityScale));
  }
  return Math.max(38, Math.min(96, visual.size * densityScale));
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

export function selectVisibleFieldLoops<T extends LayoutLoop>(
  loops: T[],
  options: { perZoneCap: number; totalCap: number; preferredId?: string | null }
): { visible: T[]; collapsed: T[] } {
  const grouped = new Map<GravityZone, T[]>();
  for (const zone of GRAVITY_ORDER) grouped.set(zone, []);
  for (const loop of loops) grouped.get(gravityZoneForState(loop.state))?.push(loop);

  grouped.forEach((group) => {
    group.sort(
      (a, b) =>
        (a.id === options.preferredId ? -1 : b.id === options.preferredId ? 1 : 0) ||
        loopPriority(a.state, a.weight) - loopPriority(b.state, b.weight) ||
        (a.visualSeed ?? 0) - (b.visualSeed ?? 0) ||
        a.id.localeCompare(b.id)
    );
  });

  const selected: T[] = [];
  for (let round = 0; round < options.perZoneCap; round++) {
    for (const zone of GRAVITY_ORDER) {
      const candidate = grouped.get(zone)?.[round];
      if (candidate && selected.length < options.totalCap) selected.push(candidate);
    }
  }

  const selectedIds = new Set(selected.map((loop) => loop.id));
  return {
    visible: loops.filter((loop) => selectedIds.has(loop.id)),
    collapsed: loops.filter((loop) => !selectedIds.has(loop.id)),
  };
}

/**
 * Stable organic lane layout. Every loop owns a deterministic, seeded position
 * inside its gravity band, so resizing cannot preserve stale drag coordinates.
 */
export function computeLoopLayout(
  items: LayoutLoop[],
  width: number,
  height: number,
  options?: Partial<LayoutOptions>
): LayoutPosition[] {
  if (items.length === 0) return [];

  const visibleCount = options?.visibleCount ?? items.length;
  const leftInset = Math.max(0, options?.leftInset ?? fieldRailWidth(width));
  const usableWidth = Math.max(1, width - leftInset);
  const horizontalGutter =
    width < 640
      ? VIEWPORT_MARGIN
      : width < 1024
        ? 32
        : Math.max(48, (usableWidth - 1240) / 2);
  const contentLeft = leftInset + horizontalGutter;
  const contentRight = Math.max(contentLeft + 1, width - horizontalGutter);
  const contentWidth = contentRight - contentLeft;
  const laneHeight = height / GRAVITY_ORDER.length;
  const compact = width < 640;
  const slotMinWidth = options?.slotMinWidth ?? (compact ? 112 : width < 1024 ? 160 : 210);
  const maxColumns = Math.max(1, Math.floor(contentWidth / slotMinWidth));
  const labelHeight = compact ? 28 : 24;
  const labelWidth = fieldLabelMaxWidth(width);

  const grouped = new Map<GravityZone, LayoutLoop[]>();
  for (const zone of GRAVITY_ORDER) grouped.set(zone, []);
  for (const item of items) grouped.get(gravityZoneForState(item.state))?.push(item);
  grouped.forEach((group) => {
    group.sort(
      (a, b) =>
        loopPriority(a.state, a.weight) - loopPriority(b.state, b.weight) ||
        (a.visualSeed ?? 0) - (b.visualSeed ?? 0) ||
        a.id.localeCompare(b.id)
    );
  });

  const positions: LayoutPosition[] = [];

  GRAVITY_ORDER.forEach((zone, zoneIndex) => {
    const group = grouped.get(zone) ?? [];
    if (group.length === 0) return;

    const columns = Math.min(group.length, maxColumns);
    const rows = Math.ceil(group.length / columns);
    const cellWidth = contentWidth / columns;
    const cellHeight = laneHeight / rows;

    group.forEach((item, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const itemsInRow = Math.min(columns, group.length - row * columns);
      const rowWidth = itemsInRow * cellWidth;
      const rowStart = contentLeft + (contentWidth - rowWidth) / 2;
      const circleSize = fieldLayoutCircleSize(item, width, visibleCount);
      const contentHeight = circleSize + 4 + labelHeight;
      const cellTop = zoneIndex * laneHeight + row * cellHeight;
      const topPadding = Math.max(4, (cellHeight - contentHeight) / 2);
      const baseX = rowStart + (column + 0.5) * cellWidth;
      const baseY = cellTop + topPadding + contentHeight / 2;
      const horizontalRoom = Math.max(0, (cellWidth - Math.max(circleSize, labelWidth)) / 2 - 6);
      const verticalRoom = Math.max(0, (cellHeight - contentHeight) / 2 - 5);
      const maxXOffset = Math.min(compact ? 12 : width < 1024 ? 28 : 64, horizontalRoom);
      const maxYOffset = Math.min(compact ? 7 : width < 1024 ? 18 : 32, verticalRoom);
      const xOffset = (seededUnit(item, 0x51f15e) * 2 - 1) * maxXOffset;
      const yOffset = (seededUnit(item, 0x9e3779) * 2 - 1) * maxYOffset;

      positions.push({
        id: item.id,
        x: baseX + xOffset,
        y: baseY + yOffset,
        labelPosition: "below",
      });
    });
  });

  return positions;
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
