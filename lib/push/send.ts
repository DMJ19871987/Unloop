import webpush from "web-push";

export function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hello@unloop.app";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendCheckinNotification(
  subscription: webpush.PushSubscription,
  frequency: number
) {
  if (!configureWebPush()) return false;

  if (frequency < 1 && Math.random() > frequency) {
    return false;
  }

  const payload = JSON.stringify({
    title: "Evening. Anything still swirling?",
    body: "A gentle moment to empty your head, if you need it.",
    url: "/offload",
    actions: [{ action: "quieter", title: "Quieter please" }],
  });

  try {
    await webpush.sendNotification(subscription, payload, {
      TTL: 60 * 60 * 24,
      urgency: "low",
    });
    return true;
  } catch {
    return false;
  }
}
