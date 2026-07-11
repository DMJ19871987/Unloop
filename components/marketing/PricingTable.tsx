"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { track } from "@/lib/analytics";
import {
  BETA_HIDE_LIFETIME,
  type PublicPlan,
  signUpUrl,
  subscribeUrl,
} from "@/lib/stripe/plans";

export function PricingTable() {
  const { isSignedIn } = useAuth();
  const [loading, setLoading] = useState<PublicPlan | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  async function startCheckout(plan: PublicPlan) {
    setLoading(plan);
    setInlineError(null);
    track("checkout_started", { plan, source: "pricing" });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.error) {
        track("checkout_failed", { plan, source: "pricing", code: "api_error" });
        setInlineError(data.error);
      }
    } catch {
      track("checkout_failed", { plan, source: "pricing", code: "network" });
      setInlineError("Checkout is unavailable. Please try again later.");
    } finally {
      setLoading(null);
    }
  }

  function handlePlanClick(plan: PublicPlan) {
    track("signup_started", { source: "pricing", plan });
    if (!isSignedIn) {
      window.location.href = signUpUrl(plan);
      return;
    }
    window.location.href = subscribeUrl(plan);
  }

  return (
    <div className="space-y-4">
      <div className="mx-auto mb-8 grid max-w-4xl grid-cols-2 gap-x-6 gap-y-3 border-y border-border py-5 font-ui text-xs text-ink-muted sm:grid-cols-4">
        {["Voice and typed offload", "Living mental field", "Searchable History", "Weekly reflections"].map((feature) => (
          <span key={feature} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            {feature}
          </span>
        ))}
      </div>
      {inlineError && (
        <p className="font-ui text-sm text-accent text-center max-w-md mx-auto">{inlineError}</p>
      )}
      <div
        className={`grid gap-6 max-w-4xl mx-auto ${
          BETA_HIDE_LIFETIME ? "md:grid-cols-2" : "md:grid-cols-3"
        }`}
      >
        <div className="md:col-span-1 order-first bg-accent-tint border-2 border-accent rounded-[24px] p-6 space-y-4 relative shadow-soft">
          <span className="absolute -top-3 left-4 px-3 py-0.5 bg-accent text-white text-xs font-ui rounded-full">
            Best value
          </span>
          <h3 className="font-heading text-xl font-medium text-ink pt-2">Annual</h3>
          <div>
            <span className="font-heading text-3xl font-semibold text-ink">£34.99</span>
            <span className="font-ui text-sm text-ink-muted">/year</span>
          </div>
          <p className="font-ui text-sm text-ink-muted">Under £3 a month</p>
          <button
            type="button"
            onClick={() => handlePlanClick("annual")}
            disabled={loading !== null}
            className="w-full py-3 rounded-full bg-accent text-white font-ui text-sm font-medium min-h-[48px] hover:bg-accent-hover transition-colors disabled:opacity-50 shadow-subtle"
          >
            {loading === "annual" ? "Loading…" : "Start 7-day free trial"}
          </button>
        </div>

        <div className="glass-panel rounded-[24px] p-6 space-y-4">
          <h3 className="font-heading text-lg font-medium text-ink">Monthly</h3>
          <div>
            <span className="font-heading text-2xl font-semibold text-ink">£4.99</span>
            <span className="font-ui text-sm text-ink-muted">/month</span>
          </div>
          <p className="font-ui text-xs text-ink-faint">Flexible monthly billing</p>
          <button
            type="button"
            onClick={() => handlePlanClick("monthly")}
            disabled={loading !== null}
            className="w-full py-3 rounded-full border border-border bg-paper/45 text-ink-soft font-ui text-sm min-h-[48px] hover:border-accent transition-colors disabled:opacity-50"
          >
            {loading === "monthly" ? "Loading…" : "Start trial"}
          </button>
        </div>
      </div>
      <p className="mx-auto max-w-xl text-center font-ui text-xs leading-relaxed text-ink-faint">
        A payment method is required. You will not be charged until the 7-day trial ends, and you can cancel from Settings before then.
      </p>
    </div>
  );
}
