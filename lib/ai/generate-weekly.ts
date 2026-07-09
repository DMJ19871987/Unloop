import Anthropic from "@anthropic-ai/sdk";
import { WEEKLY_SUMMARY_SYSTEM_PROMPT, MOCK_WEEKLY_SUMMARY } from "./weekly-summary";
import { isMockAiEnabled } from "./prompts";
import { logAiUsage } from "./log";

export interface WeekEventInput {
  label: string;
  category: string;
  fromState: string | null;
  toState: string;
  createdAt: string;
}

export interface WeekStats {
  opened: number;
  released: number;
  done: number;
  parked: number;
  dominantCategory: string;
}

export async function generateWeeklySummary(
  events: WeekEventInput[],
  stats: WeekStats,
  userId: string | null
): Promise<string> {
  if (isMockAiEnabled()) {
    await logAiUsage({
      userId,
      provider: "anthropic",
      operation: "weekly_summary",
      inputTokens: 500,
      outputTokens: 80,
      estCostUsd: 0,
    });
    return MOCK_WEEKLY_SUMMARY;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `WEEK_STATS:\n${JSON.stringify(stats, null, 2)}\n\nWEEK_EVENTS:\n${JSON.stringify(events, null, 2)}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    temperature: 0.5,
    system: WEEKLY_SUMMARY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text.trim() : MOCK_WEEKLY_SUMMARY;

  await logAiUsage({
    userId,
    provider: "anthropic",
    operation: "weekly_summary",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    estCostUsd:
      response.usage.input_tokens * 0.000003 +
      response.usage.output_tokens * 0.000015,
  });

  return text;
}
