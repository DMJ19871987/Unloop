import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { applyLoopChange, applyMerge } from "@/lib/ai/apply-changes";
import { toLoopDTO } from "@/lib/loops/transitions";
import type { LoopChangePayload } from "@/lib/ai/extraction-types";

const bodySchema = z.object({
  confirmed: z.literal(true),
  loop_id: z.string().uuid(),
  change: z.object({
    mention_count_delta: z.number().optional(),
    weight_delta: z.number().optional(),
    emotional_intensity_delta: z.number().optional(),
    next_step: z.string().nullable().optional(),
    state: z
      .enum(["open_attention", "next_step_known", "parked", "released", "done"])
      .optional(),
    merge: z
      .object({
        source_loop_id: z.string().uuid(),
        target_loop_id: z.string().uuid(),
      })
      .optional(),
  }),
  evidence: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getOrCreateUser();
  const db = getDb();

  if (!user || !db) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  try {
    const body = bodySchema.parse(await request.json());
    const change = body.change as LoopChangePayload;

    if (change.merge) {
      const updated = await applyMerge(
        db,
        user.id,
        change.merge.source_loop_id,
        change.merge.target_loop_id
      );
      return NextResponse.json({ loop: toLoopDTO(updated), removedId: change.merge.source_loop_id });
    }

    const updated = await applyLoopChange(
      db,
      user.id,
      body.loop_id,
      change,
      body.evidence
    );

    return NextResponse.json({ loop: toLoopDTO(updated) });
  } catch (error) {
    console.error("Apply proposal failed:", error);
    return NextResponse.json({ error: "Could not apply change." }, { status: 400 });
  }
}
