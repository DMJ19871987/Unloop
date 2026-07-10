import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { waitlist } from "@/lib/db/schema";
import { trackServer } from "@/lib/analytics-server";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "Waitlist is unavailable. Database not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { email } = bodySchema.parse(body);

    await db
      .insert(waitlist)
      .values({ email: email.toLowerCase() })
      .onConflictDoNothing();

    await trackServer("waitlist_signup", email.toLowerCase(), { email: email.toLowerCase() });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
