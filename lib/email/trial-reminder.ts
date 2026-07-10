export async function sendTrialReminderEmail(
  to: string,
  trialEndsAt: Date
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const endDate = trialEndsAt.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://unloop.app";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Unloop <hello@unloop.app>",
      to,
      subject: "Your trial ends soon",
      text: `Your Unloop trial ends on ${endDate}.

Your loops are safe either way. If you want to keep offloading, you can manage your subscription here:
${appUrl}/settings

If you have questions, reply to this email or write to hello@unloop.app.

— Unloop`,
    }),
  });

  return res.ok;
}
