"use client";

import { get, set, del, keys } from "idb-keyval";

export type AudioMimeType = "audio/webm" | "audio/mp4" | "audio/wav";

export interface RecordedAudio {
  blob: Blob;
  mimeType: AudioMimeType;
  durationSeconds: number;
}

export interface AudioRecorder {
  start(): Promise<void>;
  stop(): Promise<RecordedAudio>;
  subscribeLevels(callback: (levels: number[]) => void): () => void;
  readonly isRecording: boolean;
}

export interface PlatformAPI {
  createAudioRecorder(maxDurationMs?: number): AudioRecorder | null;
  vibrate(pattern?: number | number[]): void;
  notify(title: string, options?: NotificationOptions): Promise<void>;
  storeLocal<T>(key: string, value: T): Promise<void>;
  getLocal<T>(key: string): Promise<T | undefined>;
  removeLocal(key: string): Promise<void>;
  listLocalKeys(): Promise<string[]>;
  getPreferredAudioMime(): AudioMimeType;
  isOnline(): boolean;
  getTimezone(): string;
  onOnline(callback: () => void): () => void;
  subscribePush(): Promise<PushSubscriptionJSON | null>;
  canInstallPwa(): boolean;
  promptInstall(): Promise<boolean>;
  isStandalone(): boolean;
}

function getNavigator(): Navigator | null {
  if (typeof globalThis !== "undefined" && "navigator" in globalThis) {
    return globalThis.navigator;
  }
  return null;
}

function getWindow(): Window | null {
  if (typeof globalThis !== "undefined" && "window" in globalThis) {
    return globalThis as unknown as Window;
  }
  return null;
}

class PwaAudioRecorder implements AudioRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTime = 0;
  private mimeType: AudioMimeType = "audio/webm";
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private levelCallbacks = new Set<(levels: number[]) => void>();
  private rafId: number | null = null;
  private warningTimeout: ReturnType<typeof setTimeout> | null = null;
  private maxTimeout: ReturnType<typeof setTimeout> | null = null;
  private onMaxDuration: (() => void) | null = null;
  private onWarning: (() => void) | null = null;

  isRecording = false;

  constructor(
    private maxDurationMs: number,
    onMaxDuration?: () => void,
    onWarning?: () => void
  ) {
    this.onMaxDuration = onMaxDuration ?? null;
    this.onWarning = onWarning ?? null;
  }

  async start(): Promise<void> {
    const nav = getNavigator();
    if (!nav?.mediaDevices?.getUserMedia) {
      throw new Error("Microphone unavailable");
    }

    this.mimeType = platform.getPreferredAudioMime();
    this.stream = await nav.mediaDevices.getUserMedia({ audio: true });
    this.recorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
    this.chunks = [];
    this.startTime = Date.now();
    this.isRecording = true;

    const win = getWindow() as (Window & typeof globalThis) | null;
    if (win && "AudioContext" in win) {
      this.audioContext = new win.AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
      this.pollLevels();
    }

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.recorder.start(250);

    this.warningTimeout = setTimeout(() => {
      this.onWarning?.();
    }, 270000);

    this.maxTimeout = setTimeout(() => {
      this.onMaxDuration?.();
    }, this.maxDurationMs);
  }

  private pollLevels() {
    if (!this.analyser || !this.isRecording) return;

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const barCount = 11;
    const levels: number[] = [];
    const step = Math.floor(data.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const slice = data.slice(i * step, (i + 1) * step);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      levels.push(Math.max(0.15, avg / 128));
    }

    this.levelCallbacks.forEach((cb) => cb(levels));

    const win = getWindow();
    if (win) {
      this.rafId = win.requestAnimationFrame(() => this.pollLevels());
    }
  }

  async stop(): Promise<RecordedAudio> {
    if (!this.recorder || !this.isRecording) {
      throw new Error("Not recording");
    }

    this.isRecording = false;
    if (this.warningTimeout) clearTimeout(this.warningTimeout);
    if (this.maxTimeout) clearTimeout(this.maxTimeout);
    if (this.rafId !== null) {
      getWindow()?.cancelAnimationFrame(this.rafId);
    }

    return new Promise((resolve) => {
      this.recorder!.onstop = () => {
        this.stream?.getTracks().forEach((t) => t.stop());
        this.audioContext?.close();
        const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);
        resolve({
          blob: new Blob(this.chunks, { type: this.mimeType }),
          mimeType: this.mimeType,
          durationSeconds,
        });
      };
      this.recorder!.stop();
    });
  }

  subscribeLevels(callback: (levels: number[]) => void): () => void {
    this.levelCallbacks.add(callback);
    return () => this.levelCallbacks.delete(callback);
  }
}

export const platform: PlatformAPI = {
  createAudioRecorder(maxDurationMs = 300000): AudioRecorder | null {
    const nav = getNavigator();
    if (!nav?.mediaDevices?.getUserMedia) return null;
    return new PwaAudioRecorder(maxDurationMs);
  },

  getPreferredAudioMime(): AudioMimeType {
    const nav = getNavigator();
    if (!nav) return "audio/webm";
    const isIOS =
      /iPad|iPhone|iPod/.test(nav.userAgent) ||
      (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
    if (isIOS) return "audio/mp4";
    if (typeof MediaRecorder !== "undefined") {
      if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    }
    return "audio/webm";
  },

  vibrate(pattern: number | number[] = 10): void {
    const nav = getNavigator();
    nav?.vibrate?.(pattern);
  },

  async notify(title: string, options?: NotificationOptions): Promise<void> {
    const nav = getNavigator();
    if (!nav || !("Notification" in nav)) return;
    if (Notification.permission === "granted") {
      new Notification(title, options);
    }
  },

  async storeLocal<T>(key: string, value: T): Promise<void> {
    await set(key, value);
  },

  async getLocal<T>(key: string): Promise<T | undefined> {
    return get<T>(key);
  },

  async removeLocal(key: string): Promise<void> {
    await del(key);
  },

  async listLocalKeys(): Promise<string[]> {
    return keys() as Promise<string[]>;
  },

  isOnline(): boolean {
    const nav = getNavigator();
    return nav?.onLine ?? true;
  },

  getTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "Europe/London";
    }
  },

  onOnline(callback: () => void): () => void {
    const win = getWindow();
    if (!win) return () => {};
    win.addEventListener("online", callback);
    return () => win.removeEventListener("online", callback);
  },

  async subscribePush(): Promise<PushSubscriptionJSON | null> {
    const nav = getNavigator();
    const win = getWindow();
    if (!nav || !win || !("serviceWorker" in nav) || !("PushManager" in win)) {
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return null;

      const reg = await nav.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return null;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      return sub.toJSON();
    } catch {
      return null;
    }
  },

  canInstallPwa(): boolean {
    const win = getWindow() as (Window & { deferredPrompt?: Event }) | null;
    return Boolean(win?.deferredPrompt);
  },

  async promptInstall(): Promise<boolean> {
    const win = getWindow() as (Window & {
      deferredPrompt?: { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    }) | null;
    if (!win?.deferredPrompt) return false;

    await win.deferredPrompt.prompt();
    const { outcome } = await win.deferredPrompt.userChoice;
    win.deferredPrompt = undefined;
    return outcome === "accepted";
  },

  isStandalone(): boolean {
    const nav = getNavigator();
    const win = getWindow();
    return (
      (nav && "standalone" in nav && (nav as Navigator & { standalone?: boolean }).standalone === true) ||
      (win?.matchMedia("(display-mode: standalone)").matches ?? false)
    );
  },
};

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}
