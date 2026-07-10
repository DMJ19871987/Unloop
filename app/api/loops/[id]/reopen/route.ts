import { NextResponse } from "next/server";
import { requireWriteUser, isWriteBlocked } from "@/lib/auth/require-access";
import { getDb } from "@/lib/db/client";
import { reopenLoop } from "@/lib/loops/record";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const writeUser = await requireWriteUser();
  if (isWriteBlocked(writeUser)) return writeUser;
  const user = writeUser;
  const db = getDb();

  if (!db) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  try {
    const loop = await reopenLoop(db, user.id, id);
    return NextResponse.json({ loop });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
