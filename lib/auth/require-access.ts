import { NextResponse } from "next/server";
import { getOrCreateUser, requireUser } from "@/lib/auth/user";
import {
  getSubscriptionAccess,
  canUseFreeOffload,
  WRITE_BLOCKED_MESSAGE,
  FREE_OFFLOAD_MESSAGE,
  type SubscriptionAccess,
} from "@/lib/auth/subscription";

export async function getUserWithAccess(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getOrCreateUser>>>;
  access: SubscriptionAccess;
} | null> {
  const user = await getOrCreateUser();
  if (!user) return null;
  return { user, access: getSubscriptionAccess(user) };
}

export async function requireReadUser() {
  const user = await requireUser();
  return user;
}

export async function requireWriteUser() {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }
  const access = getSubscriptionAccess(user);
  if (access !== "full") {
    const message =
      user.freeOffloadUsed && !user.trialEndsAt
        ? FREE_OFFLOAD_MESSAGE
        : WRITE_BLOCKED_MESSAGE;
    return NextResponse.json({ error: message }, { status: 403 });
  }
  return user;
}

export function isWriteBlocked(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}

export { canUseFreeOffload };
