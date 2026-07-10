"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

type Plan = "annual" | "monthly" | "lifetime";

export function PricingTable() {
  const [loading, setLoading] = useState<Plan | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [cap, setCap] = useState(200);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/founding-slots")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.remaining === "number") setRemaining(data.remaining);
        if (typeof data.cap === "number") setCap(data.cap);
      })
      .catch(() => {});
  }, []);

  async function startCheckout(plan: Plan) {
    setLoading(plan);
    setInlineError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (data.remaining !== undefined) {
        setRemaining(data.remaining);
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.error) {
        setInlineError(data.error);
      }
    } catch {
      setInlineError("Checkout is unavailable. Please try again later.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {inlineError && (
        <p className="font-ui text-sm text-accent text-center max-w-md mx-auto">{inlineError}</p>
      )}
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="md:col-span-1 md:row-span-1 order-first md:order-none bg-accent-tint border-2 border-accent rounded-[24px] p-6 space-y-4 relative shadow-soft">
          <span className="absolute -top-3 left-4 px-3 py-0.5 bg-accent text-white text-xs font-ui rounded-full">
            Recommended
          </span>
          <h3 className="font-heading text-xl font-medium text-ink pt-2">Annual</h3>
          <div>
            <span className="font-heading text-3xl font-semibold text-ink">£34.99</span>
            <span className="font-ui text-sm text-ink-muted">/year</span>
          </div>
          <p className="font-ui text-sm text-ink-muted">Under £3 a month</p>
          <button
            type="button"
            onClick={() => {
              track("signup_started", { source: "pricing", plan: "annual" });
              void startCheckout("annual");
            }}
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
          <p className="font-ui text-xs text-ink-faint">More per month than annual</p>
          <button
            type="button"
            onClick={() => {
              track("signup_started", { source: "pricing", plan: "monthly" });
              void startCheckout("monthly");
            }}
            disabled={loading !== null}
            className="w-full py-3 rounded-full border border-border bg-paper/45 text-ink-soft font-ui text-sm min-h-[48px] hover:border-accent transition-colors disabled:opacity-50"
          >
            {loading === "monthly" ? "Loading…" : "Start trial"}
          </button>
        </div>

        <div className="glass-panel rounded-[24px] p-6 space-y-4">
          <h3 className="font-heading text-lg font-medium text-ink">Founding Member</h3>
          <div>
            <span className="font-heading text-2xl font-semibold text-ink">£79</span>
            <span className="font-ui text-sm text-ink-muted"> lifetime</span>
          </div>
          <p className="font-ui text-xs text-ink-faint">
            {remaining !== null
              ? `${remaining} of ${cap} remaining`
              : `First ${cap} people`}
          </p>
          <button
            type="button"
            onClick={() => {
              track("signup_started", { source: "pricing", plan: "lifetime" });
              void startCheckout("lifetime");
            }}
            disabled={loading !== null}
            className="w-full py-3 rounded-full border border-border bg-paper/45 text-ink-soft font-ui text-sm min-h-[48px] hover:border-accent transition-colors disabled:opacity-50"
          >
            {loading === "lifetime" ? "Loading…" : "Join as founding member"}
          </button>
        </div>
      </div>
    </div>
  );
}
