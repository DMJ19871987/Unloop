"use client";

import { useState } from "react";
import { STRIPE_PRICES } from "@/lib/stripe/config";
import { track } from "@/lib/analytics";

export default function SubscribePage() {
  const [loading, setLoading] = useState<"annual" | "monthly" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: "annual" | "monthly") {
    setLoading(plan);
    setError(null);
    track("signup_started", { plan, source: "subscribe" });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Checkout failed.");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Checkout failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-heading text-2xl text-ink mb-3">Start unlooping.</h1>
      <p className="font-ui text-sm text-ink-soft max-w-sm mb-10">
        Seven days free. Cancel any time. Your loops stay yours.
      </p>

      {error && (
        <p className="font-ui text-sm text-accent mb-6" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          type="button"
          onClick={() => startCheckout("annual")}
          disabled={loading !== null}
          className="min-h-[48px] px-6 py-3 rounded-full bg-accent text-paper font-ui text-sm disabled:opacity-50"
        >
          {loading === "annual"
            ? "Opening checkout…"
            : `£${(STRIPE_PRICES.annual.amount / 100).toFixed(2)}/year — 7 days free`}
        </button>
        <button
          type="button"
          onClick={() => startCheckout("monthly")}
          disabled={loading !== null}
          className="min-h-[48px] px-6 py-3 rounded-full border border-border text-ink-soft font-ui text-sm disabled:opacity-50"
        >
          {loading === "monthly"
            ? "Opening checkout…"
            : `£${(STRIPE_PRICES.monthly.amount / 100).toFixed(2)}/month`}
        </button>
      </div>
    </div>
  );
}
