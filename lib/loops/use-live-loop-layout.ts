"use client";

import { useEffect, useState } from "react";
import {
  forceCollide,
  forceManyBody,
  forceSimulation,
  type Force,
  type SimulationNodeDatum,
} from "d3-force";
import { gravityZoneForState, type GravityZone } from "./gravity";
import {
  fieldLabelMaxWidth,
  fieldLayoutCircleSize,
  type LayoutLoop,
  type LayoutPosition,
} from "./layout";

interface LiveNode extends SimulationNodeDatum {
  id: string;
  zone: GravityZone;
  anchorX: number;
  anchorY: number;
  radius: number;
  phase: number;
  labelPosition: LayoutPosition["labelPosition"];
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

function clamp(value: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2;
  return Math.max(min, Math.min(max, value));
}

export function useLiveLoopLayout(options: {
  items: LayoutLoop[];
  anchors: LayoutPosition[];
  width: number;
  height: number;
  leftInset: number;
  visibleCount: number;
  active: boolean;
}): LayoutPosition[] {
  const { items, anchors, width, height, leftInset, visibleCount, active } = options;
  const [positions, setPositions] = useState<LayoutPosition[]>(anchors);

  useEffect(() => {
    if (!active || items.length === 0) {
      setPositions(anchors);
      return;
    }

    setPositions(anchors);

    const anchorById = new Map(anchors.map((position) => [position.id, position]));
    const compact = width < 640;
    const labelWidth = fieldLabelMaxWidth(width);
    const gutter = compact ? 16 : width < 1024 ? 32 : 48;
    const contentLeft = leftInset + gutter;
    const contentRight = width - gutter;
    const laneHeight = height / 3;
    const horizontalTravel = compact ? 18 : width < 1024 ? 38 : 72;
    const verticalTravel = compact ? 6 : width < 1024 ? 14 : 26;

    const nodes: LiveNode[] = items.map((item) => {
      const anchor = anchorById.get(item.id) ?? {
        id: item.id,
        x: (contentLeft + contentRight) / 2,
        y: laneHeight * (ZONE_INDEX[gravityZoneForState(item.state)] + 0.5),
        labelPosition: "below" as const,
      };
      const circleSize = fieldLayoutCircleSize(item, width, visibleCount);
      const contentHeight = circleSize + 4 + (compact ? 28 : 24);
      const radius = Math.max(circleSize, labelWidth, contentHeight) / 2 + 10;
      const phase = ((item.visualSeed ?? 0) % 997) / 997 * Math.PI * 2;

      return {
        id: item.id,
        zone: gravityZoneForState(item.state),
        anchorX: anchor.x,
        anchorY: anchor.y,
        radius,
        phase,
        labelPosition: anchor.labelPosition,
        x: anchor.x,
        y: anchor.y,
        vx: Math.cos(phase) * 0.08,
        vy: Math.sin(phase) * 0.04,
      };
    });

    let wanderNodes: LiveNode[] = nodes;
    const startedAt = Date.now();
    const wander = ((alpha: number) => {
      const elapsed = (Date.now() - startedAt) / 1000;
      for (const node of wanderNodes) {
        const desiredX =
          node.anchorX +
          Math.cos(elapsed * 0.105 + node.phase) * horizontalTravel +
          Math.sin(elapsed * 0.061 + node.phase * 1.7) * horizontalTravel * 0.28;
        const desiredY =
          node.anchorY +
          Math.sin(elapsed * 0.087 + node.phase * 1.3) * verticalTravel;
        node.vx = (node.vx ?? 0) + (desiredX - (node.x ?? node.anchorX)) * 0.0028 * alpha;
        node.vy = (node.vy ?? 0) + (desiredY - (node.y ?? node.anchorY)) * 0.0032 * alpha;
      }
    }) as Force<LiveNode, undefined>;
    wander.initialize = (nextNodes) => {
      wanderNodes = nextNodes;
    };

    let publishCounter = 0;
    const simulation = forceSimulation(nodes)
      .randomSource(seededRandom(items.reduce((sum, item) => sum ^ (item.visualSeed ?? 0), 0xc2b2ae35)))
      .alpha(0.5)
      .alphaTarget(0.32)
      .alphaDecay(0.025)
      .velocityDecay(0.3)
      .force("wander", wander)
      .force("charge", forceManyBody<LiveNode>().strength(compact ? -10 : -18))
      .force("collide", forceCollide<LiveNode>((node) => node.radius).strength(0.96).iterations(2))
      .on("tick", () => {
        for (const node of nodes) {
          const zoneTop = ZONE_INDEX[node.zone] * laneHeight;
          const zoneBottom = zoneTop + laneHeight;
          const safeRadius = Math.min(node.radius, laneHeight / 2 - 6);
          const minX = contentLeft + safeRadius;
          const maxX = contentRight - safeRadius;
          const minY = zoneTop + safeRadius;
          const maxY = zoneBottom - safeRadius;
          const nextX = clamp(node.x ?? node.anchorX, minX, maxX);
          const nextY = clamp(node.y ?? node.anchorY, minY, maxY);

          if (nextX !== node.x) node.vx = -(node.vx ?? 0) * 0.35;
          if (nextY !== node.y) node.vy = -(node.vy ?? 0) * 0.35;
          node.x = nextX;
          node.y = nextY;
        }

        publishCounter += 1;
        if (publishCounter % 4 !== 0) return;
        setPositions(
          nodes.map((node) => ({
            id: node.id,
            x: node.x ?? node.anchorX,
            y: node.y ?? node.anchorY,
            labelPosition: node.labelPosition,
          }))
        );
      });

    return () => {
      simulation.stop();
    };
  }, [active, anchors, height, items, leftInset, visibleCount, width]);

  return positions;
}
