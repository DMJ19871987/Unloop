"use client";

import { useEffect, useState } from "react";
import { getConsentState, setConsentState } from "@/lib/analytics";

export function AnalyticsConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getConsentState() === "pending");
  }, []);

  if (!visible || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 glass-panel rounded-2xl p-4 shadow-soft border border-border"
      role="dialog"
      aria-label="Analytics consent"
    >
      <p className="font-ui text-sm text-ink-soft mb-3 leading-relaxed">
        We use privacy-safe analytics to improve Unloop. No audio, transcripts, or loop content is
        sent. You can change this in Settings.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setConsentState("declined");
            setVisible(false);
          }}
          className="flex-1 min-h-[44px] px-4 py-2 rounded-full border border-border font-ui text-sm text-ink-soft"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => {
            setConsentState("accepted");
            setVisible(false);
          }}
          className="flex-1 min-h-[44px] px-4 py-2 rounded-full bg-accent text-white font-ui text-sm"
        >
          Accept analytics
        </button>
      </div>
    </div>
  );
}
