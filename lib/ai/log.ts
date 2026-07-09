import { getDb } from "@/lib/db/client";
import { aiUsageLog } from "@/lib/db/schema";

interface LogAiUsageParams {
  userId: string | null;
  provider: "anthropic" | "openai";
  operation: "transcribe" | "extract" | "weekly_summary" | "next_step_stt";
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
  estCostUsd?: number;
}

export async function logAiUsage(params: LogAiUsageParams) {
  const db = getDb();
  if (!db) return;

  await db.insert(aiUsageLog).values({
    userId: params.userId,
    provider: params.provider,
    operation: params.operation,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    audioSeconds: params.audioSeconds,
    estCostUsd: params.estCostUsd,
  });
}
