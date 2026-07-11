const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://unloop.app";

function emailShell(title: string, body: string) {
  return {
    html: `<!DOCTYPE html><html><body style="font-family:Georgia,serif;color:#2a2a2a;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:20px;font-weight:500">${title}</h1>
<p style="white-space:pre-wrap;line-height:1.6">${body}</p>
<p style="font-size:13px;color:#666;margin-top:32px">
<a href="${APP_URL}/settings">Unsubscribe from weekly emails</a> in Settings.
</p>
<p style="font-size:13px;color:#666">— Unloop</p>
</body></html>`,
    text: `${title}\n\n${body}\n\nUnsubscribe from weekly emails in Settings: ${APP_URL}/settings\n\n— Unloop`,
  };
}

export async function sendWeeklySummaryEmail(
  to: string,
  summaryText: string,
  userId?: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.warn("RESEND_API_KEY missing — weekly emails cannot send");
    }
    return false;
  }

  const { html, text } = emailShell("Your week in loops", summaryText);

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
      html,
      text,
      tags: userId ? [{ name: "user_id", value: userId }] : undefined,
    }),
  });

  return res.ok;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
