export async function sendWeeklySummaryEmail(
  to: string,
  summaryText: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Unloop <hello@unloop.app>",
      to,
      subject: "Your week in loops",
      text: `${summaryText}\n\n— Unloop\n\nUnsubscribe from weekly emails in Settings.`,
    }),
  });

  return res.ok;
}
