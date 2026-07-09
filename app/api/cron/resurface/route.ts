import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getStaleParkedLoops } from "@/lib/loops/record";

function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "No database." }, { status: 503 });
  }

  const allUsers = await db.query.users.findMany();
  let flagged = 0;

  for (const user of allUsers) {
    const stale = await getStaleParkedLoops(db, user.id);
    if (stale.length > 0) flagged++;
  }

  return NextResponse.json({
    message: "Resurface check complete. Banners shown in-app on next field visit.",
    usersWithStaleParked: flagged,
  });
}
