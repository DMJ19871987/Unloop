import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/auth/user";
import { requireWriteUser, isWriteBlocked } from "@/lib/auth/require-access";
import { getDb } from "@/lib/db/client";
import { applyMerge } from "@/lib/ai/apply-changes";
import { toLoopDTO } from "@/lib/loops/transitions";

const bodySchema = z.object({
  targetLoopId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sourceId } = await params;
  const writeUser = await requireWriteUser();
  if (isWriteBlocked(writeUser)) return writeUser;
  const user = writeUser;
  const db = getDb();

  if (!db) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  try {
    const { targetLoopId } = bodySchema.parse(await request.json());

    const updated = await applyMerge(db, user.id, sourceId, targetLoopId);

    return NextResponse.json({ loop: toLoopDTO(updated) });
  } catch {
    return NextResponse.json({ error: "Merge failed." }, { status: 400 });
  }
}
