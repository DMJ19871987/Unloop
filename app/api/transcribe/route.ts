import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/user";
import { requireWriteUser, isWriteBlocked } from "@/lib/auth/require-access";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const writeUser = await requireWriteUser();
  if (isWriteBlocked(writeUser)) return writeUser;
  const user = writeUser;

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const purpose = formData.get("purpose");
    const operation = purpose === "next_step" ? "next_step_stt" : "transcribe";

    const rate = await checkRateLimit(user.id, ["transcribe", "extract"]);
    if (operation === "transcribe" && !rate.allowed) {
      return NextResponse.json({ error: rate.message }, { status: 429 });
    }

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "No audio provided." }, { status: 400 });
    }

    if (audio.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Recording is too long. Try a shorter offload." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const mimeType = audio.type || "audio/webm";

    const result = await transcribeAudio(buffer, mimeType, user.id, operation);

    if (result.durationSeconds > 330) {
      return NextResponse.json(
        { error: "Recording is too long. Try a shorter offload." },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Transcription failed. Your recording is still held locally." },
      { status: 500 }
    );
  }
}
