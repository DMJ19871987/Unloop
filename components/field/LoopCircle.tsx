"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { LoopState } from "@/lib/loops/state";
import { arcCompleteness, loopVisualStyle } from "@/lib/loops/state";

const CIRCUMFERENCE = 282.743;

export interface LoopCircleProps {
  label?: string;
  state?: LoopState;
  weight?: number;
  emotionalIntensity?: number;
  visualSeed?: number;
  size?: number;
  arc?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  labelColor?: string;
  labelOpacity?: number;
  animateArc?: number;
  className?: string;
  style?: React.CSSProperties;
  drift?: boolean;
  showLabel?: boolean;
}

function seededJitter(seed: number, index: number): number {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function buildWobblyPath(
  cx: number,
  cy: number,
  r: number,
  seed: number,
  segments = 64
): string {
  const points: string[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const jitter = seededJitter(seed, i) * 1.8;
    const radius = r + jitter;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return points.join(" ") + " Z";
}

export function LoopCircle({
  label,
  state = "open_attention",
  weight = 3,
  emotionalIntensity = 2,
  visualSeed = 42,
  size: sizeOverride,
  arc: arcOverride,
  stroke: strokeOverride,
  strokeWidth: strokeWidthOverride,
  opacity: opacityOverride,
  labelColor,
  labelOpacity = 0.85,
  animateArc,
  className = "",
  style,
  drift = false,
  showLabel = true,
}: LoopCircleProps) {
  const visual = loopVisualStyle(state, weight, emotionalIntensity);
  const size = sizeOverride ?? visual.size;
  const arc = arcOverride ?? arcCompleteness(state, weight, visualSeed);
  const stroke = strokeOverride ?? visual.stroke;
  const strokeWidth = strokeWidthOverride ?? visual.strokeWidth;
  const opacity = opacityOverride ?? visual.opacity;
  const displayArc = animateArc ?? arc;

  const dashArray = useMemo(() => {
    const dashLen = Math.max(0, Math.min(1, displayArc)) * CIRCUMFERENCE;
    return `${dashLen.toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`;
  }, [displayArc]);

  const path = useMemo(
    () => buildWobblyPath(50, 50, 45, visualSeed),
    [visualSeed]
  );

  const content = (
    <div
      className={`flex flex-col items-center gap-1 ${className}`}
      style={{ width: size, ...style }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="block overflow-visible"
        aria-hidden={!label}
      >
        <defs>
          <filter id={`wobble-${visualSeed}`} x="-25%" y="-25%" width="150%" height="150%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.018"
              numOctaves={2}
              seed={visualSeed % 100}
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" />
          </filter>
        </defs>
        <g transform="rotate(-90 50 50)" filter={`url(#wobble-${visualSeed})`}>
          <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={dashArray}
            opacity={opacity}
            style={{
              transition: animateArc !== undefined ? "stroke-dasharray 900ms ease-out" : undefined,
            }}
          />
        </g>
      </svg>
      {showLabel && label && (
        <span
          className="font-ui text-[13px] font-medium text-center whitespace-nowrap"
          style={{
            color: labelColor ?? "var(--ink-soft)",
            opacity: labelOpacity,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );

  if (drift) {
    return (
      <motion.div
        animate={{
          x: [0, 3, -2, 1, 0],
          y: [0, -2, 3, -1, 0],
        }}
        transition={{
          duration: 30 + (visualSeed % 10),
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}
