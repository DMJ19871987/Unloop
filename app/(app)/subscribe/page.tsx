"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { STRIPE_PRICES } from "@/lib/stripe/config";
import { parsePublicPlan, type PublicPlan } from "@/lib/stripe/plans";
import { track } from "@/lib/analytics";

export default function SubscribePage() {
  const searchParams = useSearchParams();
  const initialPlan = parsePublicPlan(searchParams.get("plan")) ?? "annual";
  const [selectedPlan, setSelectedPlan] = useState<PublicPlan>(initialPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const plan = parsePublicPlan(searchParams.get("plan"));
    if (plan) setSelectedPlan(plan);
  }, [searchParams]);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    track("checkout_started", { plan: selectedPlan, source: "subscribe" });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        track("checkout_failed", {
          plan: selectedPlan,
          source: "subscribe",
          code: res.status === 401 ? "unauthorised" : "api_error",
        });
        setError(data.error ?? "Checkout failed.");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      track("checkout_failed", { plan: selectedPlan, source: "subscribe", code: "network" });
      setError("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
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

      <div className="flex flex-col gap-3 w-full max-w-xs mb-6">
        <button
          type="button"
          onClick={() => setSelectedPlan("annual")}
          className={`min-h-[48px] px-6 py-3 rounded-full font-ui text-sm border transition-colors ${
            selectedPlan === "annual"
              ? "bg-accent text-paper border-accent"
              : "border-border text-ink-soft"
          }`}
        >
          £{(STRIPE_PRICES.annual.amount / 100).toFixed(2)}/year — 7 days free
        </button>
        <button
          type="button"
          onClick={() => setSelectedPlan("monthly")}
          className={`min-h-[48px] px-6 py-3 rounded-full font-ui text-sm border transition-colors ${
            selectedPlan === "monthly"
              ? "bg-accent text-paper border-accent"
              : "border-border text-ink-soft"
          }`}
        >
          £{(STRIPE_PRICES.monthly.amount / 100).toFixed(2)}/month
        </button>
      </div>

      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="min-h-[48px] px-8 py-3 rounded-full bg-accent text-paper font-ui text-sm disabled:opacity-50"
      >
        {loading ? "Opening checkout…" : "Continue to checkout"}
      </button>
    </div>
  );
}
