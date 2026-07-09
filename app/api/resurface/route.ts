import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { shouldShowResurfaceBanner, markResurfaceShown } from "@/lib/loops/record";

export async function GET() {
  const user = await getOrCreateUser();
  const db = getDb();

  if (!user || !db) {
    return NextResponse.json({ show: false, loops: [] });
  }

  const result = await shouldShowResurfaceBanner(db, user.id);
  return NextResponse.json(result);
}

export async function POST() {
  const user = await getOrCreateUser();
  const db = getDb();

  if (!user || !db) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  await markResurfaceShown(db, user.id);
  return NextResponse.json({ success: true });
}
