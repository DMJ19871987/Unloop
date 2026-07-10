"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { platform } from "@/lib/platform";
import { track } from "@/lib/analytics";
import {
  blobToBase64,
  enqueueOffload,
  processQueue,
  isQueueError,
} from "@/lib/offload/queue";
import { mergePendingProposals } from "@/lib/offload/proposal-storage";
import { RecordButton } from "./RecordButton";
import { Waveform } from "./Waveform";

type CapturePhase = "idle" | "listening" | "gathering" | "processing" | "typing" | "offline";

export function CaptureScreen() {
  const router = useRouter();
  const recorderRef = useRef<ReturnType<typeof platform.createAudioRecorder>>(null);
  const offloadStartRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [levels, setLevels] = useState<number[]>([]);
  const [statusText, setStatusText] = useState("Empty your head.");
  const [typedText, setTypedText] = useState("");
  const [micDenied, setMicDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasQueuedAudio, setHasQueuedAudio] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [writeBlocked, setWriteBlocked] = useState(false);
  const [retryPayload, setRetryPayload] = useState<{
    transcript: string;
    inputMode: "voice" | "text";
    durationSeconds?: number;
  } | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const stopAndProcessRef = useRef<() => Promise<void>>(async () => {});

  const runExtract = useCallback(
    async (
      transcript: string,
      inputMode: "voice" | "text",
      durationSeconds?: number
    ) => {
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

      let res: Response;
      let data;
      try {
        res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, inputMode, durationSeconds }),
        });
        data = await res.json();
      } catch {
        setError("Something went wrong. Your words are safe — try again.");
        setRetryPayload({ transcript, inputMode, durationSeconds });
        setPhase("idle");
        setStatusText("Empty your head.");
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setRetryPayload({ transcript, inputMode, durationSeconds });
        setPhase("idle");
        setStatusText("Empty your head.");
        return;
      }

      setRetryPayload(null);

      const elapsed = offloadStartRef.current
        ? Math.round((Date.now() - offloadStartRef.current) / 1000)
        : undefined;
      track("offload_completed", {
        loops_new: data.stats?.new ?? 0,
        loops_matched: data.stats?.matched ?? 0,
        duration: elapsed,
        mode: inputMode,
      });
      offloadStartRef.current = null;

      if (data.crisis) {
        router.push("/field?crisis=support");
        return;
      }

      if ((data.stats?.new ?? 0) === 0 && (data.stats?.matched ?? 0) === 0) {
        router.push("/field?clear=1");
        return;
      }

      if (data.proposals?.length) {
        mergePendingProposals(data.proposals);
      }

      const createdIds = (data.created ?? data.newLoops ?? [])
        .map((l: { id: string }) => l.id)
        .filter(Boolean);

      const params = new URLSearchParams({
        session: data.sessionId,
        matched: String(data.stats.matched),
      });
      if (createdIds.length > 0) {
        params.set("new", createdIds.join(","));
      }
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
      const ext = mimeType.includes("mp4")
        ? "mp4"
        : mimeType.includes("wav")
          ? "wav"
          : "webm";
      formData.append("audio", blob, `recording.${ext}`);

      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const transcribeData = await transcribeRes.json();

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
        setHasQueuedAudio(true);
        setPhase("idle");
        setStatusText("Empty your head.");
        return;
      }

      const { transcript, durationSeconds: dur } = transcribeData;
      if (!transcript?.trim()) {
        setError("We couldn't pick up any words. Try speaking a little longer.");
        setPhase("idle");
        setStatusText("Empty your head.");
        return;
      }
      await runExtract(transcript, "voice", dur ?? durationSeconds);
    },
    [runExtract, router]
  );

  const stopAndProcess = useCallback(async () => {
    if (phase !== "listening") return;
    try {
      const audio = await recorderRef.current?.stop();
      unsubRef.current?.();
      unsubRef.current = null;
      if (audio) {
        setPhase("gathering");
        setStatusText("Processing…");
        await new Promise((r) => setTimeout(r, 600));
        await processVoice(audio.blob, audio.mimeType, audio.durationSeconds);
      }
    } catch {
      setPhase("idle");
      setStatusText("Empty your head.");
    }
  }, [phase, processVoice]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.subscriptionAccess && data.subscriptionAccess !== "full") {
          setWriteBlocked(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    stopAndProcessRef.current = stopAndProcess;
  }, [stopAndProcess]);

  const retryQueue = useCallback(async () => {
    setRetrying(true);
    setError(null);
    const result = await processQueue();
    setRetrying(false);

    if (isQueueError(result)) {
      setError(result.error);
      return;
    }

    if (result?.crisis) {
      router.push("/field?crisis=support");
      return;
    }

    if (result?.sessionId) {
      setHasQueuedAudio(false);
      if (result.proposals?.length) {
        mergePendingProposals(result.proposals);
      }
      const params = new URLSearchParams({
        session: result.sessionId,
        queued: "1",
      });
      if (result.createdIds?.length) {
        params.set("new", result.createdIds.join(","));
      }
      if (result.stats?.matched) {
        params.set("matched", String(result.stats.matched));
      }
      router.push(`/field?${params.toString()}`);
    }
  }, [router]);

  useEffect(() => {
    const tryQueue = async () => {
      if (platform.isOnline()) {
        const result = await processQueue();
        if (isQueueError(result)) {
          setError(result.error);
          setHasQueuedAudio(true);
          return;
        }
        if (result?.crisis) {
          router.push("/field?crisis=support");
          return;
        }
        if (result?.sessionId) {
          setHasQueuedAudio(false);
          if (result.proposals?.length) {
            mergePendingProposals(result.proposals);
          }
          const params = new URLSearchParams({
            session: result.sessionId,
            queued: "1",
          });
          if (result.createdIds?.length) {
            params.set("new", result.createdIds.join(","));
          }
          if (result.stats?.matched) {
            params.set("matched", String(result.stats.matched));
          }
          router.push(`/field?${params.toString()}`);
        }
      }
    };
    tryQueue();

    return platform.onOnline(() => tryQueue());
  }, [router]);

  const handleRecordTap = async () => {
    setError(null);

    if (phase === "listening") {
      await stopAndProcess();
      return;
    }

    try {
      const recorder = platform.createAudioRecorder(300000, {
        onWarning: () => setStatusText("30 seconds left."),
        onMaxReached: () => {
          void stopAndProcessRef.current();
        },
      });
      if (!recorder) {
        setMicDenied(true);
        return;
      }

      recorderRef.current = recorder;
      await recorder.start();
      unsubRef.current = recorder.subscribeLevels(setLevels);
      offloadStartRef.current = Date.now();
      track("offload_started", { mode: "voice" });
      setPhase("listening");
      setStatusText("Listening…");
    } catch {
      setMicDenied(true);
    }
  };

  const handleTextExtract = () => {
    if (writeBlocked) return;
    offloadStartRef.current = Date.now();
    track("offload_started", { mode: "text" });
    runExtract(typedText.trim(), "text");
  };

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
                onTap={writeBlocked ? () => {} : handleRecordTap}
              />
            )}

            {(phase === "listening" || phase === "gathering") && (
              <Waveform
                levels={levels}
                active={phase === "listening"}
                gathering={phase === "gathering"}
              />
            )}

            <p className="font-ui text-sm text-ink-faint tracking-wide">{statusText}</p>

            {micDenied && (
              <p className="font-ui text-sm text-ink-muted text-center max-w-xs">
                Microphone access is needed for voice offload. You can type instead.
              </p>
            )}

            {error && (
              <div className="flex flex-col items-center gap-2 max-w-xs">
                <p className="font-ui text-sm text-accent text-center">{error}</p>
                {(hasQueuedAudio || retryPayload) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (hasQueuedAudio) {
                        void retryQueue();
                      } else if (retryPayload) {
                        setError(null);
                        void runExtract(
                          retryPayload.transcript,
                          retryPayload.inputMode,
                          retryPayload.durationSeconds
                        );
                      }
                    }}
                    disabled={retrying}
                    className="font-ui text-sm text-ink-soft hover:text-accent-selected min-h-[48px] disabled:opacity-40"
                  >
                    {retrying ? "Trying again…" : "Try again"}
                  </button>
                )}
              </div>
            )}

            {writeBlocked && (
              <p className="font-ui text-sm text-ink-muted text-center max-w-xs">
                Your subscription has lapsed. Your loops are safe — renew to keep offloading.
              </p>
            )}

            {phase === "idle" && !writeBlocked && (
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
                disabled={!typedText.trim() || writeBlocked}
                onClick={handleTextExtract}
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
