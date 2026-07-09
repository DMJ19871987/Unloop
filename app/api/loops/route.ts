import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { getActiveLoops, toLoopDTO } from "@/lib/loops/transitions";
import { computeLoopLayout, summariseLoops, partitionFieldLoops } from "@/lib/loops/layout";

export async function GET() {
  const user = await getOrCreateUser();
  const db = getDb();

  if (!user || !db) {
    return NextResponse.json({ loops: [], summary: "Nothing occupying you right now" });
  }

  const active = await getActiveLoops(db, user.id);
  const dtos = active.map(toLoopDTO);
  const { visible } = partitionFieldLoops(
    dtos.map((l) => ({
      id: l.id,
      state: l.state,
      weight: l.weight,
      emotionalIntensity: l.emotionalIntensity,
      label: l.label,
      visualSeed: l.visualSeed,
    })),
    false
  );
  const visibleIds = new Set(visible.map((v) => v.id));
  const toLayout = dtos.filter((l) => visibleIds.has(l.id));

  const positions = computeLoopLayout(
    toLayout.map((l) => ({
      id: l.id,
      state: l.state,
      weight: l.weight,
      emotionalIntensity: l.emotionalIntensity,
      label: l.label,
      visualSeed: l.visualSeed,
    })),
    390,
    520,
    { visibleCount: toLayout.length }
  );

  const posMap = new Map(positions.map((p) => [p.id, p]));
  const loops = dtos.map((l) => ({
    ...l,
    x: posMap.get(l.id)?.x,
    y: posMap.get(l.id)?.y,
  }));

  const summary = summariseLoops(loops);

  return NextResponse.json({ loops, summary });
}
