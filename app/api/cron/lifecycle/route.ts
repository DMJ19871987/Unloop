import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { verifyCronSecret } from "@/lib/cron/auth";
import { runLifecycleSweep } from "@/lib/lifecycle/sweep";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "No database." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");

  const result = await runLifecycleSweep(db, cursor);

  return NextResponse.json({
    ...result,
    completed: result.cursor === null,
    ranAt: new Date().toISOString(),
  });
}
