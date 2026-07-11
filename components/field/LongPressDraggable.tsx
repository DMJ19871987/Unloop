"use client";

import { useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { motion, useDragControls, type PanInfo } from "framer-motion";
import { platform } from "@/lib/platform";

interface LongPressDraggableProps {
  disabled?: boolean;
  children: ReactNode;
  onDragStart: () => void;
  onDrag: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  onDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
}

const HOLD_DELAY_MS = 420;
const MOVE_TOLERANCE_PX = 8;

export function LongPressDraggable({
  disabled = false,
  children,
  onDragStart,
  onDrag,
  onDragEnd,
}: LongPressDraggableProps) {
  const controls = useDragControls();
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null);
  const [armed, setArmed] = useState(false);

  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    pointerOrigin.current = null;
  };

  const beginPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    clearHold();

    if (event.pointerType === "mouse") {
      controls.start(event);
      return;
    }

    pointerOrigin.current = { x: event.clientX, y: event.clientY };
    const nativeEvent = event.nativeEvent;
    holdTimer.current = setTimeout(() => {
      setArmed(true);
      platform.vibrate(12);
      controls.start(nativeEvent, { snapToCursor: false });
      holdTimer.current = null;
    }, HOLD_DELAY_MS);
  };

  const trackPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = pointerOrigin.current;
    if (!origin || armed) return;
    const distance = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
    if (distance > MOVE_TOLERANCE_PX) clearHold();
  };

  return (
    <motion.div
      drag={!disabled}
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      dragSnapToOrigin
      onPointerDown={beginPointer}
      onPointerMove={trackPointer}
      onPointerUp={() => {
        clearHold();
        setArmed(false);
      }}
      onPointerCancel={() => {
        clearHold();
        setArmed(false);
      }}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={() => {
        clearHold();
        setArmed(true);
        onDragStart();
      }}
      onDrag={onDrag}
      onDragEnd={(event, info) => {
        setArmed(false);
        onDragEnd(event, info);
      }}
      whileDrag={{ scale: 1.06, zIndex: 40, cursor: "grabbing" }}
      className="touch-pan-y"
    >
      <motion.div
        animate={armed ? { scale: [1, 1.045, 1] } : { scale: 1 }}
        transition={
          armed
            ? { duration: 0.75, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.16 }
        }
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
