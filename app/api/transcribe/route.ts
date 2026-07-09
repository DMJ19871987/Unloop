import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/user";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getOrCreateUser();

  if (user) {
    const rate = await checkRateLimit(user.id, ["transcribe"]);
    if (!rate.allowed) {
      return NextResponse.json({ error: rate.message }, { status: 429 });
    }
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

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

    const result = await transcribeAudio(buffer, mimeType, user?.id ?? null);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Transcription failed. Your recording is still held locally." },
      { status: 500 }
    );
  }
}
