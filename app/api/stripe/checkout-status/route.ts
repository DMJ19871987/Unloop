import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { reconcileFromCheckoutSession } from "@/lib/billing/reconcile-subscription";
import { getStripe } from "@/lib/stripe/config";

export async function GET(request: Request) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
  }

  const stripe = getStripe();
  const db = getDb();
  if (!stripe || !db) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (session.metadata?.userId !== user.id) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (session.payment_status === "paid") {
    await reconcileFromCheckoutSession(db, stripe, session);
  }

  const refreshed = await db.query.users.findFirst({ where: eq(users.id, user.id) });

  return NextResponse.json({
    paymentStatus: session.payment_status,
    status: session.status,
    trialEndsAt: refreshed?.trialEndsAt ?? null,
    subscriptionStatus: refreshed?.subscriptionStatus ?? user.subscriptionStatus,
    ready: Boolean(refreshed?.trialEndsAt) || refreshed?.subscriptionStatus === "lifetime",
  });
}
