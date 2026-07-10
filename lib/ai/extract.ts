import Anthropic from "@anthropic-ai/sdk";
import { EXTRACTION_SYSTEM_PROMPT, isMockAiEnabled } from "./prompts";
import { logAiUsage } from "./log";
import { mockExtractLoops } from "./mock-extract";
import type { ExistingLoopContext, ExtractionModelOutput } from "./extraction-types";

export type { ExistingLoopContext, ExtractionModelOutput };

export async function extractLoops(
  transcript: string,
  existingLoops: ExistingLoopContext[],
  userId: string | null
): Promise<ExtractionModelOutput> {
  if (isMockAiEnabled()) {
    await logAiUsage({
      userId,
      provider: "anthropic",
      operation: "extract",
      inputTokens: transcript.length,
      outputTokens: 200,
      estCostUsd: 0,
    });
    return mockExtractLoops(transcript, existingLoops);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `TRANSCRIPT:\n${transcript}\n\nEXISTING_LOOPS:\n${JSON.stringify(existingLoops, null, 2)}`;

  async function callClaude(retry = false): Promise<ExtractionModelOutput> {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      temperature: 0.3,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: retry
            ? `${userMessage}\n\nReturn ONLY valid JSON.`
            : userMessage,
        },
      ],
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    await logAiUsage({
      userId,
      provider: "anthropic",
      operation: "extract",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      estCostUsd:
        response.usage.input_tokens * 0.000003 +
        response.usage.output_tokens * 0.000015,
    });

    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as ExtractionModelOutput;
    return {
      new_loops: parsed.new_loops ?? [],
      matched_loops: parsed.matched_loops ?? [],
      merge_suggestions: parsed.merge_suggestions ?? [],
      flag: parsed.flag ?? null,
    };
  }

  try {
    return await callClaude();
  } catch {
    return await callClaude(true);
  }
}
