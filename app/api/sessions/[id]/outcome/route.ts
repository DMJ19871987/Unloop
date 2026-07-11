import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth/user";
import { getDb } from "@/lib/db/client";
import { offloadSessions } from "@/lib/db/schema";

const bodySchema = z.object({
  outcome: z.enum(["yes", "somewhat", "not_yet"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  const db = getDb();
  if (!user || !db) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { outcome } = bodySchema.parse(body);

  const session = await db.query.offloadSessions.findFirst({
    where: and(eq(offloadSessions.id, id), eq(offloadSessions.userId, user.id)),
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  await db
    .update(offloadSessions)
    .set({
      sessionOutcome: outcome,
      sessionOutcomeAt: new Date(),
    })
    .where(eq(offloadSessions.id, id));

  return NextResponse.json({ ok: true });
}
