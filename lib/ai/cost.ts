/** AI pricing configuration — update pricingVersion when rates change. */
export const AI_PRICING_VERSION = "2026-07-01";

export const WHISPER_USD_PER_MINUTE = 0.006;
export const CLAUDE_INPUT_USD_PER_MTOK = 3.0;
export const CLAUDE_OUTPUT_USD_PER_MTOK = 15.0;

export function estimateTranscriptionCostUsd(audioSeconds: number): number {
  const minutes = Math.max(0, audioSeconds) / 60;
  return minutes * WHISPER_USD_PER_MINUTE;
}

export function estimateExtractionCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * CLAUDE_INPUT_USD_PER_MTOK +
    (outputTokens / 1_000_000) * CLAUDE_OUTPUT_USD_PER_MTOK
  );
}
