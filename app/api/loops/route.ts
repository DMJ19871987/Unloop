import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { getActiveLoops, toLoopDTO } from "@/lib/loops/transitions";
import { computeLoopLayout, summariseLoops } from "@/lib/loops/layout";

export async function GET() {
  const user = await getOrCreateUser();
  const db = getDb();

  if (!user || !db) {
    return NextResponse.json({ loops: [], summary: "Nothing occupying you right now" });
  }

  const active = await getActiveLoops(db, user.id);
  const dtos = active.map(toLoopDTO);
  const positions = computeLoopLayout(
    dtos.map((l) => ({
      id: l.id,
      state: l.state,
      weight: l.weight,
      emotionalIntensity: l.emotionalIntensity,
    })),
    390,
    600
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
