import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { loops } from "@/lib/db/schema";
import { toLoopDTO } from "@/lib/loops/transitions";

const bodySchema = z.object({
  targetLoopId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sourceId } = await params;
  const user = await getOrCreateUser();
  const db = getDb();

  if (!user || !db) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  try {
    const { targetLoopId } = bodySchema.parse(await request.json());

    const [source, target] = await Promise.all([
      db.query.loops.findFirst({
        where: and(eq(loops.id, sourceId), eq(loops.userId, user.id)),
      }),
      db.query.loops.findFirst({
        where: and(eq(loops.id, targetLoopId), eq(loops.userId, user.id)),
      }),
    ]);

    if (!source || !target) {
      return NextResponse.json({ error: "Loop not found." }, { status: 404 });
    }

    const [updated] = await db
      .update(loops)
      .set({
        weight: Math.min(5, target.weight + 1),
        mentionCount: (target.mentionCount ?? 1) + (source.mentionCount ?? 1),
        updatedAt: new Date(),
      })
      .where(eq(loops.id, targetLoopId))
      .returning();

    await db.delete(loops).where(eq(loops.id, sourceId));

    return NextResponse.json({ loop: toLoopDTO(updated) });
  } catch {
    return NextResponse.json({ error: "Merge failed." }, { status: 400 });
  }
}
