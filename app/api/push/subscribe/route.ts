import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function POST(request: Request) {
  const user = await getOrCreateUser();
  const db = getDb();
  if (!user || !db) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const subscription = await request.json();

  await db
    .update(users)
    .set({ pushSubscription: subscription })
    .where(eq(users.id, user.id));

  return NextResponse.json({ success: true });
}

export async function PATCH() {
  const user = await getOrCreateUser();
  const db = getDb();
  if (!user || !db) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const newFreq = Math.max(0.25, (user.notificationFrequency ?? 1) / 2);

  await db
    .update(users)
    .set({ notificationFrequency: newFreq })
    .where(eq(users.id, user.id));

  return NextResponse.json({ notificationFrequency: newFreq });
}
