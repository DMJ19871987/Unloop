"use client";

import { useRef, useState } from "react";
import { platform } from "@/lib/platform";

interface NextStepInputProps {
  onSave: (nextStep: string) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

export function NextStepInput({
  onSave,
  onCancel,
  saving = false,
}: NextStepInputProps) {
  const [value, setValue] = useState("");
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<ReturnType<typeof platform.createAudioRecorder>>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || saving) return;
    void onSave(trimmed);
  };

  const toggleMic = async () => {
    setMicError(null);

    if (recording) {
      try {
        const audio = await recorderRef.current?.stop();
        recorderRef.current = null;
        setRecording(false);
        if (!audio) return;

        const formData = new FormData();
        const ext = audio.mimeType.includes("mp4") ? "mp4" : "webm";
        formData.append("audio", audio.blob, `next-step.${ext}`);
        formData.append("purpose", "next_step");

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok || !data.transcript?.trim()) {
          setMicError("Could not transcribe that. Try typing instead.");
          return;
        }

        setValue(data.transcript.trim());
      } catch {
        setMicError("Recording failed. Try typing instead.");
        setRecording(false);
      }
      return;
    }

    try {
      const recorder = platform.createAudioRecorder(30000);
      if (!recorder) {
        setMicError("Microphone unavailable.");
        return;
      }
      recorderRef.current = recorder;
      await recorder.start();
      setRecording(true);
    } catch {
      setMicError("Microphone access denied.");
    }
  };

  return (
    <div className="space-y-3 max-w-sm mx-auto">
      <p className="font-ui text-xs text-ink-placeholder tracking-wide">
        What&apos;s the next step?
      </p>
      <div className="flex items-center gap-3 bg-accent-tint/40 border border-border-soft rounded-2xl px-4 py-3.5">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Draft the cover letter…"
          className="flex-1 bg-transparent font-ui text-[15px] text-ink placeholder:text-ink-placeholder focus:outline-none"
          autoFocus
          disabled={saving || recording}
        />
        <button
          type="button"
          onClick={() => void toggleMic()}
          disabled={saving}
          className="shrink-0 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-paper/60 transition-colors disabled:opacity-40"
          aria-label={recording ? "Stop recording" : "Record next step"}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={recording ? "var(--accent)" : "var(--accent-selected)"}
            strokeWidth="1.6"
            strokeLinecap="round"
            className={recording ? "opacity-100" : "opacity-60"}
            aria-hidden
          >
            <rect x="9" y="2.5" width="6" height="11" rx="3" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
            <line x1="12" y1="17.5" x2="12" y2="21" />
          </svg>
        </button>
      </div>
      {recording && (
        <p className="font-ui text-xs text-ink-faint text-center">Listening — up to 30 seconds.</p>
      )}
      {micError && (
        <p className="font-ui text-xs text-accent text-center">{micError}</p>
      )}
      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving || recording}
          className="px-4 py-2 rounded-full border border-border font-ui text-sm min-h-[48px] disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!value.trim() || saving || recording}
          onClick={submit}
          className="px-4 py-2 rounded-full bg-accent text-white font-ui text-sm min-h-[48px] disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
