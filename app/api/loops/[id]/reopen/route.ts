import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { reopenLoop } from "@/lib/loops/record";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  const db = getDb();

  if (!user || !db) {
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
