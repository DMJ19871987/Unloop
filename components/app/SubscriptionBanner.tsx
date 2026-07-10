"use client";

import { useEffect, useState } from "react";
import type { SubscriptionAccess } from "@/lib/auth/subscription";

interface SubscriptionBannerProps {
  access: SubscriptionAccess;
  subscriptionStatus: string;
}

export function SubscriptionBanner({ access, subscriptionStatus }: SubscriptionBannerProps) {
  const [loading, setLoading] = useState(false);

  if (access === "full") return null;

  const isPastDue = subscriptionStatus === "past_due";

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="px-6 py-3 bg-accent-soft/40 border-b border-border text-center"
      role="status"
    >
      <p className="font-ui text-sm text-ink">
        {isPastDue
          ? "There is a problem with your payment. Update your card to keep offloading."
          : subscriptionStatus === "trialing"
            ? "Choose a plan to start offloading. Your first seven days are free."
            : "Your subscription has ended. Your loops are safe — renew to keep offloading."}
      </p>
      <button
        type="button"
        onClick={() => (isPastDue ? openPortal() : (window.location.href = "/subscribe"))}
        disabled={loading}
        className="mt-2 font-ui text-sm text-accent underline underline-offset-2 min-h-[48px] px-4"
      >
        {loading ? "Opening…" : isPastDue ? "Update payment" : "Choose a plan"}
      </button>
    </div>
  );
}
