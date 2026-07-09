"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { platform } from "@/lib/platform";
import {
  blobToBase64,
  enqueueOffload,
  processQueue,
} from "@/lib/offload/queue";
import { RecordButton } from "./RecordButton";
import { Waveform } from "./Waveform";

type CapturePhase = "idle" | "listening" | "processing" | "typing" | "offline";

export function CaptureScreen() {
  const router = useRouter();
  const recorderRef = useRef<ReturnType<typeof platform.createAudioRecorder>>(null);
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [levels, setLevels] = useState<number[]>([]);
  const [statusText, setStatusText] = useState("Empty your head.");
  const [typedText, setTypedText] = useState("");
  const [micDenied, setMicDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const runExtract = useCallback(
    async (transcript: string, inputMode: "voice" | "text", durationSeconds?: number) => {
      setPhase("processing");
      setStatusText("Finding your loops…");

      if (!platform.isOnline()) {
        await enqueueOffload({
          id: crypto.randomUUID(),
          type: inputMode,
          transcript: inputMode === "text" ? transcript : undefined,
          createdAt: Date.now(),
          durationSeconds,
        });
        setPhase("offline");
        setStatusText("Held safely — will process when you're back online.");
        setTimeout(() => router.push("/field?offline=1"), 2000);
        return;
      }

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, inputMode, durationSeconds }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setPhase("idle");
        setStatusText("Empty your head.");
        return;
      }

      if (data.stats.total === 0 && data.stats.new === 0) {
        router.push("/field?clear=1");
        return;
      }

      const params = new URLSearchParams({
        session: data.sessionId,
        new: String(data.stats.new),
        matched: String(data.stats.matched),
      });
      if (data.showCrisisCard) params.set("crisis", "1");
      router.push(`/field?${params.toString()}`);
    },
    [router]
  );

  const processVoice = useCallback(
    async (blob: Blob, mimeType: string, durationSeconds: number) => {
      setPhase("processing");
      setStatusText("Finding your loops…");

      if (!platform.isOnline()) {
        const audioBase64 = await blobToBase64(blob);
        await enqueueOffload({
          id: crypto.randomUUID(),
          type: "voice",
          audioBase64,
          mimeType,
          durationSeconds,
          createdAt: Date.now(),
        });
        setPhase("offline");
        setStatusText("Held safely — will process when you're back online.");
        setTimeout(() => router.push("/field?offline=1"), 2000);
        return;
      }

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeRes.ok) {
        const audioBase64 = await blobToBase64(blob);
        await enqueueOffload({
          id: crypto.randomUUID(),
          type: "voice",
          audioBase64,
          mimeType,
          durationSeconds,
          createdAt: Date.now(),
        });
        setError("Transcription failed. Your recording is held locally.");
        setPhase("idle");
        setStatusText("Empty your head.");
        return;
      }

      const { transcript, durationSeconds: dur } = await transcribeRes.json();
      await runExtract(transcript, "voice", dur ?? durationSeconds);
    },
    [runExtract, router]
  );

  const handleRecordTap = async () => {
    setError(null);

    if (phase === "listening") {
      try {
        const audio = await recorderRef.current?.stop();
        unsubRef.current?.();
        unsubRef.current = null;
        if (audio) {
          await processVoice(audio.blob, audio.mimeType, audio.durationSeconds);
        }
      } catch {
        setPhase("idle");
        setStatusText("Empty your head.");
      }
      return;
    }

    try {
      const recorder = platform.createAudioRecorder(300000);
      if (!recorder) {
        setMicDenied(true);
        return;
      }

      recorderRef.current = recorder;
      await recorder.start();
      unsubRef.current = recorder.subscribeLevels(setLevels);
      setPhase("listening");
      setStatusText("Listening…");
    } catch {
      setMicDenied(true);
    }
  };

  useEffect(() => {
    const tryQueue = async () => {
      if (platform.isOnline()) {
        const result = await processQueue();
        if (result?.sessionId) {
          router.push(`/field?session=${result.sessionId}&queued=1`);
        }
      }
    };
    tryQueue();

    return platform.onOnline(() => tryQueue());
  }, [router]);

  return (
    <div className="min-h-[85vh] flex flex-col bg-paper">
      <div className="text-center pt-4 text-xs tracking-[3px] uppercase text-ink-placeholder">
        Unloop
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6 pb-10">
        {phase !== "typing" ? (
          <>
            <h1 className="font-heading text-[27px] font-medium text-ink text-center">
              {phase === "processing" ? "Finding your loops…" : "Empty your head."}
            </h1>

            {phase === "processing" ? (
              <motion.div
                className="w-3 h-3 rounded-full bg-accent"
                animate={{ scale: [1, 0.6, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            ) : (
              <RecordButton
                isRecording={phase === "listening"}
                onTap={handleRecordTap}
              />
            )}

            {phase === "listening" && <Waveform levels={levels} active />}

            <p className="font-ui text-sm text-ink-faint tracking-wide">{statusText}</p>

            {micDenied && (
              <p className="font-ui text-sm text-ink-muted text-center max-w-xs">
                Microphone access is needed for voice offload. You can type instead.
              </p>
            )}

            {error && (
              <p className="font-ui text-sm text-accent text-center max-w-xs">{error}</p>
            )}

            {phase === "idle" && (
              <button
                type="button"
                onClick={() => setPhase("typing")}
                className="font-ui text-sm text-ink-faint hover:text-accent-selected transition-colors min-h-[48px]"
              >
                or type it
              </button>
            )}
          </>
        ) : (
          <div className="w-full max-w-md space-y-4">
            <h2 className="font-heading text-xl text-ink text-center">Type your offload</h2>
            <textarea
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="What's swirling around…"
              className="w-full h-40 p-4 rounded-2xl border border-border bg-sheet font-ui text-sm text-ink resize-none focus:outline-none focus:border-accent"
              autoFocus
            />
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setPhase("idle");
                  setTypedText("");
                }}
                className="px-5 py-3 rounded-full border border-border font-ui text-sm text-ink-soft min-h-[48px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!typedText.trim()}
                onClick={() => runExtract(typedText.trim(), "text")}
                className="px-5 py-3 rounded-full bg-accent text-white font-ui text-sm min-h-[48px] disabled:opacity-40"
              >
                Find loops
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
