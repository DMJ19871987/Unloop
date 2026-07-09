import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { loops } from "@/lib/db/schema";
import { transitionLoop, toLoopDTO } from "@/lib/loops/transitions";
import type { ClosureAction } from "@/lib/types/loop";

const bodySchema = z.union([
  z.object({
    action: z.enum([
      "done",
      "next_step_known",
      "parked",
      "released",
      "still_on_mind",
    ]),
    nextStep: z.string().optional(),
    resurfaceAfter: z.string().datetime().optional(),
    note: z.string().optional(),
  }),
  z.object({
    label: z.string().min(1).max(80),
  }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  const db = getDb();

  if (!user || !db) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const data = bodySchema.parse(body);

    if ("label" in data) {
      const [updated] = await db
        .update(loops)
        .set({ label: data.label, updatedAt: new Date() })
        .where(and(eq(loops.id, id), eq(loops.userId, user.id)))
        .returning();

      if (!updated) {
        return NextResponse.json({ error: "Loop not found." }, { status: 404 });
      }
      return NextResponse.json({ loop: toLoopDTO(updated) });
    }

    const updated = await transitionLoop(
      db,
      user.id,
      id,
      data.action as ClosureAction,
      {
        nextStep: data.nextStep,
        resurfaceAfter: data.resurfaceAfter
          ? new Date(data.resurfaceAfter)
          : undefined,
        note: data.note,
      }
    );

    return NextResponse.json({ loop: toLoopDTO(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  const db = getDb();

  if (!user || !db) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  await db
    .delete(loops)
    .where(and(eq(loops.id, id), eq(loops.userId, user.id)));

  return NextResponse.json({ success: true });
}
