"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { LoopState } from "@/lib/loops/state";
import { arcCompleteness, loopVisualStyle } from "@/lib/loops/state";
import { buildLoopArcPath, arcStrokeLayers } from "@/lib/loops/arc-path";

import type { LabelPosition } from "@/lib/loops/layout-types";

export type { LabelPosition };

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
  closingMode?: "done" | "released";
  className?: string;
  style?: React.CSSProperties;
  drift?: boolean;
  showLabel?: boolean;
  labelPosition?: LabelPosition;
  visibleCount?: number;
  forField?: boolean;
}

const VIEW_R = 45;

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
  closingMode,
  className = "",
  style,
  drift = false,
  showLabel = true,
  labelPosition = "below",
  visibleCount = 1,
  forField = false,
}: LoopCircleProps) {
  const visual = loopVisualStyle(state, weight, emotionalIntensity, {
    visibleCount,
    forField,
  });
  const size = sizeOverride ?? visual.size;
  const arc = arcOverride ?? arcCompleteness(state, weight, visualSeed);
  const stroke = strokeOverride ?? visual.stroke;
  const strokeWidth = strokeWidthOverride ?? visual.strokeWidth;
  const opacity = opacityOverride ?? visual.opacity;

  const [displayArc, setDisplayArc] = useState(arc);
  const [displayStroke, setDisplayStroke] = useState(stroke);

  useEffect(() => {
    setDisplayStroke(stroke);
  }, [stroke]);

  useEffect(() => {
    if (animateArc === undefined) {
      setDisplayArc(arc);
      return;
    }
    const start = arc;
    const end = animateArc;
    const startStroke = stroke;
    const t0 = performance.now();
    const duration = 900;
    let frame: number;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplayArc(start + (end - start) * eased);
      if (closingMode === "released") {
        setDisplayStroke(
          t < 1
            ? `color-mix(in srgb, ${startStroke} ${Math.round((1 - t) * 100)}%, var(--closed))`
            : "var(--closed)"
        );
      }
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [animateArc, arc, stroke, closingMode]);

  const path = useMemo(
    () => buildLoopArcPath(50, 50, VIEW_R, displayArc, visualSeed),
    [displayArc, visualSeed]
  );

  const strokeLayers = useMemo(
    () => arcStrokeLayers(strokeWidth, visualSeed),
    [strokeWidth, visualSeed]
  );

  const labelNode =
    showLabel && label ? (
      <span
        className={`font-ui text-[13px] font-medium text-center whitespace-nowrap ${
          labelPosition === "right" ? "ml-2 self-center" : ""
        }`}
        style={{
          color: labelColor ?? "var(--ink-soft)",
          opacity: labelOpacity,
        }}
      >
        {label}
      </span>
    ) : null;

  const content = (
    <div
      className={`flex ${
        labelPosition === "right"
          ? "flex-row items-center"
          : labelPosition === "above"
            ? "flex-col-reverse items-center"
            : "flex-col items-center"
      } gap-1 ${className}`}
      style={{ width: labelPosition === "right" ? undefined : size, ...style }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="block shrink-0 overflow-visible drop-shadow-[0_10px_18px_rgba(67,51,38,0.08)] transition duration-300 group-hover:drop-shadow-[0_14px_24px_rgba(67,51,38,0.14)]"
        aria-hidden={!label}
      >
        {strokeLayers.map((layer, i) => (
          <path
            key={i}
            d={path}
            fill="none"
            stroke={closingMode === "released" ? displayStroke : stroke}
            strokeWidth={layer.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={opacity * layer.opacity}
          />
        ))}
      </svg>
      {labelNode}
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
