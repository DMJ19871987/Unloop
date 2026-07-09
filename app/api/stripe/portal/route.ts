import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/config";

export async function POST() {
  const user = await getOrCreateUser();
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!user || !stripe || !user.stripeCustomerId) {
    return NextResponse.json(
      { error: "Billing portal unavailable." },
      { status: 503 }
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
