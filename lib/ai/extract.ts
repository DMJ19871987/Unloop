import Anthropic from "@anthropic-ai/sdk";
import { EXTRACTION_SYSTEM_PROMPT, isMockAiEnabled, MOCK_EXTRACTION_RESPONSE } from "./prompts";
import { logAiUsage } from "./log";

export interface ExistingLoopInput {
  id: string;
  label: string;
  state: string;
  weight: number;
}

export interface ExtractedNewLoop {
  label: string;
  weight: number;
  emotional_intensity: number;
  category: string;
  next_step: string | null;
}

export interface ExtractedMatchedLoop {
  loop_id: string;
  weight_delta: 0 | 1;
  next_step: string | null;
}

export interface ExtractionResponse {
  new_loops: ExtractedNewLoop[];
  matched_loops: ExtractedMatchedLoop[];
  flag: "crisis" | null;
}

export async function extractLoops(
  transcript: string,
  existingLoops: ExistingLoopInput[],
  userId: string | null
): Promise<ExtractionResponse> {
  if (isMockAiEnabled()) {
    await logAiUsage({
      userId,
      provider: "anthropic",
      operation: "extract",
      inputTokens: transcript.length,
      outputTokens: 200,
      estCostUsd: 0,
    });
    return MOCK_EXTRACTION_RESPONSE;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `TRANSCRIPT:\n${transcript}\n\nEXISTING_LOOPS:\n${JSON.stringify(existingLoops, null, 2)}`;

  async function callClaude(retry = false): Promise<ExtractionResponse> {
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
        (response.usage.input_tokens * 0.000003 +
          response.usage.output_tokens * 0.000015),
    });

    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as ExtractionResponse;
  }

  try {
    return await callClaude();
  } catch {
    return await callClaude(true);
  }
}
