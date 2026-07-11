const ALLOWED_SERVER_EVENTS = [
  "trial_started",
  "subscription_converted",
  "subscription_canceled",
  "account_deleted",
  "waitlist_signup",
  "checkout_started",
  "checkout_completed",
  "checkout_failed",
  "first_loop_action",
] as const;

type AnalyticsEvent = (typeof ALLOWED_SERVER_EVENTS)[number];

export async function trackServer(
  event: AnalyticsEvent,
  distinctId: string,
  properties?: Record<string, unknown>
) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
  if (!key) return;

  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: { ...properties, $lib: "posthog-node-shim" },
      }),
    });
  } catch {
    // Analytics must not break core flows
  }
}

export async function deletePostHogPerson(distinctId: string) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
  if (!key) return;

  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event: "$delete_person",
        distinct_id: distinctId,
        properties: { $delete_person: true },
      }),
    });
  } catch {
    // Best effort
  }
}
