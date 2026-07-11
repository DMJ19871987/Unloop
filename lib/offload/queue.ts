"use client";

import { platform } from "@/lib/platform";
import type { CrisisResources } from "@/lib/safety/crisis-resources";
import type { ExtractionProposal } from "@/lib/ai/extraction-types";

const TTL_MS = 24 * 60 * 60 * 1000;
const QUEUE_KEY = "unloop:offload-queue";

export type QueueStatus = "queued" | "processing" | "failed";

export interface QueuedOffload {
  id: string;
  type: "voice" | "text";
  audioBase64?: string;
  mimeType?: string;
  transcript?: string;
  durationSeconds?: number;
  createdAt: number;
  expiresAt: number;
  attemptCount: number;
  status: QueueStatus;
}

function withDefaults(item: Partial<QueuedOffload> & Pick<QueuedOffload, "id" | "type">): QueuedOffload {
  const createdAt = item.createdAt ?? Date.now();
  return {
    ...item,
    createdAt,
    expiresAt: item.expiresAt ?? createdAt + TTL_MS,
    attemptCount: item.attemptCount ?? 0,
    status: item.status ?? "queued",
  };
}

export async function purgeExpiredQueue(): Promise<void> {
  const queue = await getQueue();
  const now = Date.now();
  const fresh = queue.filter((q) => q.expiresAt > now);
  if (fresh.length !== queue.length) {
    await platform.storeLocal(QUEUE_KEY, fresh);
  }
}

export async function getQueue(): Promise<QueuedOffload[]> {
  await purgeExpiredQueue();
  const raw = (await platform.getLocal<QueuedOffload[]>(QUEUE_KEY)) ?? [];
  return raw.map((item) => withDefaults(item));
}

export async function enqueueOffload(item: Omit<QueuedOffload, "expiresAt" | "attemptCount" | "status" | "createdAt"> & { createdAt?: number }) {
  await purgeExpiredQueue();
  const queue = await getQueue();
  queue.push(
    withDefaults({
      ...item,
      createdAt: item.createdAt ?? Date.now(),
    })
  );
  await platform.storeLocal(QUEUE_KEY, queue);
}

export async function removeFromQueue(id: string) {
  const queue = await getQueue();
  await platform.storeLocal(
    QUEUE_KEY,
    queue.filter((q) => q.id !== id)
  );
}

export async function discardQueuedItem(id: string) {
  await removeFromQueue(id);
}

export async function clearQueue() {
  await platform.storeLocal(QUEUE_KEY, []);
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export interface ExtractQueueResult {
  crisis?: boolean;
  sessionId?: string;
  resources?: CrisisResources;
  stats?: ExtractionStats;
  proposals?: ExtractionProposal[];
  createdIds?: string[];
}

export interface ProcessQueueError {
  error: string;
  code?: string;
}

export type ProcessQueueOutcome = ExtractQueueResult | ProcessQueueError;

export function isQueueError(
  result: ProcessQueueOutcome | null
): result is ProcessQueueError {
  return result !== null && "error" in result;
}

export async function processQueue(
  onProgress?: (message: string) => void
): Promise<ProcessQueueOutcome | null> {
  if (!platform.isOnline()) return null;

  await purgeExpiredQueue();
  const queue = await getQueue();
  if (queue.length === 0) return null;

  const item = queue[0];
  item.status = "processing";
  item.attemptCount += 1;
  await platform.storeLocal(QUEUE_KEY, queue);

  onProgress?.("Processing held offload…");

  try {
    let transcript = item.transcript;

    if (item.type === "voice" && item.audioBase64 && item.mimeType) {
      const blob = base64ToBlob(item.audioBase64, item.mimeType);
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      if (!transcribeRes.ok) throw new Error("Transcribe failed");
      const data = await transcribeRes.json();
      transcript = data.transcript;
    }

    if (!transcript) throw new Error("No transcript");

    const extractRes = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        inputMode: item.type,
        durationSeconds: item.durationSeconds,
      }),
    });

    if (!extractRes.ok) throw new Error("Extract failed");
    const result = (await extractRes.json()) as ExtractQueueResult & {
      created?: { id: string }[];
      newLoops?: { id: string }[];
    };
    const createdIds = (result.created ?? result.newLoops ?? []).map((l) => l.id);
    await removeFromQueue(item.id);
    return { ...result, createdIds };
  } catch {
    const updated = await getQueue();
    const current = updated.find((q) => q.id === item.id);
    if (current) {
      current.status = "failed";
      await platform.storeLocal(QUEUE_KEY, updated);
    }
    return {
      error: "Could not process your held offload. Try again when you are back online.",
      code: "queue_process_failed",
    };
  }
}

export interface ExtractionStats {
  new: number;
  matched: number;
  total: number;
  openAttention: number;
  nextStepKnown: number;
  parked: number;
}
