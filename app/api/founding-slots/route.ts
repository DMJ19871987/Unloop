import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { foundingMemberCounter } from "@/lib/db/schema";
import { STRIPE_PRICES } from "@/lib/stripe/config";

export async function GET() {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  const counter = await db.query.foundingMemberCounter.findFirst({
    where: eq(foundingMemberCounter.id, "default"),
  });

  const sold = counter?.soldCount ?? 0;
  const cap = STRIPE_PRICES.lifetime.cap;
  const remaining = Math.max(0, cap - sold);

  return NextResponse.json({ remaining, cap, sold });
}
