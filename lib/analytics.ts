"use client";

import posthog from "posthog-js";

const CONSENT_KEY = "unloop:analytics-consent";

export const ALLOWED_EVENTS = [
  "signup_started",
  "signup_completed",
  "checkout_started",
  "checkout_completed",
  "checkout_failed",
  "trial_started",
  "offload_started",
  "offload_completed",
  "offload_failed",
  "first_loop_action",
  "loop_state_changed",
  "session_outcome_recorded",
  "weekly_summary_viewed",
  "subscription_converted",
  "subscription_canceled",
  "notification_optin",
  "notification_quieter_tapped",
  "data_exported",
  "$pageview",
] as const;

export type AllowedEvent = (typeof ALLOWED_EVENTS)[number];

let initialised = false;

export type ConsentState = "pending" | "accepted" | "declined";

export function getConsentState(): ConsentState {
  if (typeof window === "undefined") return "pending";
  const stored = localStorage.getItem(CONSENT_KEY);
  if (stored === "accepted") return "accepted";
  if (stored === "declined") return "declined";
  return "pending";
}

export function setConsentState(state: "accepted" | "declined") {
  localStorage.setItem(CONSENT_KEY, state);
  if (state === "declined") {
    resetAnalytics();
  } else {
    initAnalytics();
  }
}

export function initAnalytics() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
  if (!key || initialised) return;
  if (getConsentState() !== "accepted") return;

  posthog.init(key, {
    api_host: host,
    autocapture: false,
    disable_session_recording: true,
    capture_pageview: false,
    persistence: "localStorage",
    loaded: (ph) => {
      ph.opt_out_capturing();
      ph.opt_in_capturing();
    },
  });
  initialised = true;
}

export function identifyUser(internalUserId: string) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (getConsentState() !== "accepted") return;
  posthog.identify(internalUserId);
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (getConsentState() !== "accepted") return;
  if (!ALLOWED_EVENTS.includes(event as AllowedEvent)) return;
  posthog.capture(event, properties);
}

export function trackPageview(path: string) {
  if (getConsentState() !== "accepted") return;
  track("$pageview", { $current_url: path });
}

export function resetAnalytics() {
  if (initialised) {
    posthog.reset();
    initialised = false;
  }
}

export function withdrawConsent() {
  if (typeof window !== "undefined") {
    localStorage.setItem(CONSENT_KEY, "declined");
  }
  resetAnalytics();
}
