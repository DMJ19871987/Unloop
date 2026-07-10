"use client";

import { useEffect, useState } from "react";
import { platform } from "@/lib/platform";

interface InstallPromptProps {
  show: boolean;
  onDismiss: () => void | Promise<void>;
}

export function InstallPrompt({ show, onDismiss }: InstallPromptProps) {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as Window & { deferredPrompt?: Event };
    const handler = (e: Event) => {
      e.preventDefault();
      win.deferredPrompt = e;
      setCanInstall(true);
    };
    win.addEventListener("beforeinstallprompt", handler);
    return () => win.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show || platform.isStandalone()) return null;

  return (
    <div className="mx-6 mb-4 bg-accent-tint border border-accent/20 rounded-2xl px-5 py-4">
      <p className="font-ui text-sm text-ink-soft leading-relaxed">
        Keep Unloop on your home screen for quick access when your head feels full.
      </p>
      <div className="flex gap-3 mt-3">
        {canInstall && (
          <button
            type="button"
            onClick={async () => {
              await platform.promptInstall();
              onDismiss();
            }}
            className="px-4 py-2 rounded-full bg-accent text-white font-ui text-sm min-h-[48px]"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2 rounded-full border border-border font-ui text-sm text-ink-soft min-h-[48px]"
        >
          Not now
        </button>
      </div>
      {!canInstall && (
        <p className="font-ui text-xs text-ink-faint mt-2">
          On iPhone: tap Share, then Add to Home Screen.
        </p>
      )}
    </div>
  );
}
