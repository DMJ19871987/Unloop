import OpenAI from "openai";
import { logAiUsage } from "./log";

export function isMockTranscribeEnabled(): boolean {
  return process.env.MOCK_AI === "true" || !process.env.OPENAI_API_KEY;
}

export async function transcribeAudio(
  buffer: Buffer,
  mimeType: string,
  userId: string | null,
  operation: "transcribe" | "next_step_stt" = "transcribe"
): Promise<{ transcript: string; durationSeconds: number }> {
  if (isMockTranscribeEnabled()) {
    await logAiUsage({
      userId,
      provider: "openai",
      operation,
      audioSeconds: 30,
      estCostUsd: 0,
    });
    return {
      transcript:
        "I keep thinking about the job application and whether I should message Tom about Saturday. The garden needs sorting. I need to call the bank about that charge. Mum's birthday is coming up and I haven't planned anything.",
      durationSeconds: 30,
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const file = new File([new Uint8Array(buffer)], "audio.webm", { type: mimeType });

  const result = await client.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "en",
    temperature: 0,
  });

  const rawDuration = Math.ceil(buffer.length / 16000);
  const durationSeconds = Math.min(330, Math.max(1, rawDuration));

  await logAiUsage({
    userId,
    provider: "openai",
    operation,
    audioSeconds: durationSeconds,
    estCostUsd: 0.006,
  });

  return {
    transcript: result.text,
    durationSeconds,
  };
}
