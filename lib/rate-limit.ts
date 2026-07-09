import { getDb } from "@/lib/db/client";
import { aiUsageLog } from "@/lib/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";

const SOFT_LIMIT = 20;
const HARD_LIMIT = 40;

export async function checkRateLimit(
  userId: string,
  operations: ("transcribe" | "extract")[]
): Promise<{ allowed: boolean; soft: boolean; message?: string }> {
  const db = getDb();
  if (!db) return { allowed: true, soft: false };

  const dayAgo = new Date();
  dayAgo.setDate(dayAgo.getDate() - 1);

  const logs = await db.query.aiUsageLog.findMany({
    where: and(
      eq(aiUsageLog.userId, userId),
      inArray(aiUsageLog.operation, operations),
      gte(aiUsageLog.createdAt, dayAgo)
    ),
  });

  const count = logs.length;

  if (count >= HARD_LIMIT) {
    return {
      allowed: false,
      soft: false,
      message: "You have reached today's offload limit. Try again tomorrow.",
    };
  }

  if (count >= SOFT_LIMIT) {
    return {
      allowed: true,
      soft: true,
      message: "You have been unlooping a lot today. Take your time.",
    };
  }

  return { allowed: true, soft: false };
}
