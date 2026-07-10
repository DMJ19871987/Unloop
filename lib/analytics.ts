"use client";

import posthog from "posthog-js";

let initialised = false;

export function initAnalytics() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
  if (!key || initialised) return;
  posthog.init(key, {
    api_host: host,
    autocapture: false,
    disable_session_recording: true,
    capture_pageview: false,
    persistence: "localStorage",
  });
  initialised = true;
}

export function identifyUser(clerkId: string, email?: string) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.identify(clerkId, email ? { email } : undefined);
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

export function trackPageview(path: string) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.capture("$pageview", { $current_url: path });
}
