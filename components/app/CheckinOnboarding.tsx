"use client";

import { platform } from "@/lib/platform";
import { track } from "@/lib/analytics";

interface CheckinOnboardingProps {
  onYes: () => void;
  onNo: () => void;
}

export function CheckinOnboarding({ onYes, onNo }: CheckinOnboardingProps) {
  return (
    <div
      role="dialog"
      aria-labelledby="checkin-title"
      className="fixed inset-0 z-50 flex items-end justify-center px-6 pb-10 bg-paper/70"
    >
      <div className="bg-sheet border border-border rounded-2xl p-6 max-w-sm w-full shadow-subtle">
        <h2 id="checkin-title" className="font-heading text-xl text-ink text-center">
          Evening check-in
        </h2>
        <p className="font-ui text-sm text-ink-muted text-center mt-3 leading-relaxed">
          Want a gentle 8pm nudge to empty your head?
        </p>
        <div className="flex flex-col gap-2 mt-6">
          <button
            type="button"
            onClick={async () => {
              const sub = await platform.subscribePush();
              if (sub) {
                await fetch("/api/push/subscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(sub),
                });
              }
              onYes();
              track("notification_optin", { type: "checkin_onboarding" });
            }}
            className="w-full py-3 rounded-full bg-accent text-white font-ui text-sm min-h-[48px]"
          >
            Yes, gently
          </button>
          <button
            type="button"
            onClick={onNo}
            className="w-full py-3 rounded-full border border-border font-ui text-sm text-ink-soft min-h-[48px]"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
