import { STRIPE_PRICES } from "@/lib/stripe/config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://unloop.app";

function emailShell(title: string, body: string) {
  return {
    html: `<!DOCTYPE html><html><body style="font-family:Georgia,serif;color:#2a2a2a;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:20px;font-weight:500">${title}</h1>
${body}
<p style="font-size:13px;color:#666;margin-top:32px">— Unloop</p>
</body></html>`,
    text: `${title}\n\n${body.replace(/<[^>]+>/g, "")}\n\n— Unloop`,
  };
}

export async function sendTrialReminderEmail(
  to: string,
  trialEndsAt: Date,
  userId?: string
): Promise<{ ok: boolean; configured: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.warn("RESEND_API_KEY missing — trial reminders cannot send");
    }
    return { ok: false, configured: false };
  }

  const endDate = trialEndsAt.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const renewalAmount = `£${(STRIPE_PRICES.monthly.amount / 100).toFixed(2)}/month or £${(STRIPE_PRICES.annual.amount / 100).toFixed(2)}/year`;

  const body = `<p>Your Unloop trial ends on <strong>${endDate}</strong>.</p>
<p>After that, your plan renews at ${renewalAmount} unless you cancel.</p>
<p>Your loops are safe either way. Manage or cancel any time:</p>
<p><a href="${APP_URL}/settings">Manage subscription</a></p>
<p>Questions? Reply to this email or write to hello@unloop.app.</p>`;

  const { html, text } = emailShell("Your trial ends soon", body);

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
      html,
      text,
      tags: userId ? [{ name: "user_id", value: userId }] : undefined,
    }),
  });

  return { ok: res.ok, configured: true };
}
