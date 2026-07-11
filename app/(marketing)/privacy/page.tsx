import Link from "next/link";

export const metadata = {
  title: "Privacy — Unloop",
};

const EFFECTIVE_DATE = "11 July 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper px-6 py-16">
      <article className="max-w-2xl mx-auto prose prose-neutral">
        <Link href="/" className="font-ui text-sm text-ink-faint hover:text-accent-selected mb-8 inline-block no-underline">
          ← Back
        </Link>
        <h1 className="font-heading text-3xl font-medium text-ink mb-2">Privacy policy</h1>
        <p className="font-ui text-xs text-ink-faint mb-6">Effective {EFFECTIVE_DATE}</p>

        <div className="font-ui text-ink-muted space-y-4 text-sm leading-relaxed">
          <p>
            <strong>Controller:</strong> Unloop (contact:{" "}
            <a href="mailto:hello@unloop.app" className="text-accent-selected">hello@unloop.app</a>
            ). We are the data controller for account, loop, and session data described below.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">What we collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Account data:</strong> email, timezone, notification preferences, billing status (via Stripe).</li>
            <li><strong>Offload data:</strong> transcripts (optional), extracted loops, loop events, session metadata.</li>
            <li><strong>Technical data:</strong> pseudonymous analytics (with consent), AI usage metrics without content.</li>
          </ul>
          <p>
            Audio is transcribed and not retained on Unloop servers. When offline, recordings may be held temporarily on your device for up to 24 hours until sent or discarded.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Purposes and lawful bases</h2>
          <p>
            We process account and loop data to provide the service (contract, UK GDPR Article 6(1)(b)). Billing is processed to manage your subscription (contract). Optional analytics run only with consent (Article 6(1)(a)).
          </p>
          <p>
            Free-text offloads may include health-related content. We rely on your explicit consent to process this content for extraction (Article 9(2)(a)), given when you choose to offload. Crisis-flagged content is handled separately below. <em>Obtain legal review of the Article 6/9 basis before production launch.</em>
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Processors</h2>
          <p>
            Clerk (authentication), Stripe (payments), Neon (database), Vercel (hosting), Anthropic and OpenAI (AI processing), Resend (email), PostHog EU (analytics, with consent). Data may be processed outside the UK; we use providers with appropriate safeguards.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Retention</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Loops and account data: until you delete your account.</li>
            <li>Transcripts: while your account exists, unless you disable storage.</li>
            <li>Crisis-flagged transcripts: up to 30 days, then permanently deleted.</li>
            <li>Offline queue audio: up to 24 hours on your device only.</li>
            <li>Analytics: pseudonymous events per PostHog retention settings.</li>
          </ul>

          <h2 className="font-heading text-lg text-ink pt-4">Automated processing</h2>
          <p>
            AI extracts loops from transcripts. This is not a medical or diagnostic assessment. You can review and correct proposals before they are applied.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Your rights</h2>
          <p>
            Under UK GDPR you may access, export, rectify, or erase your data. Export and delete are available in Settings. You may complain to the ICO:{" "}
            <a href="https://ico.org.uk" className="text-accent-selected" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Crisis-flagged transcripts</h2>
          <p>
            If safety checks flag content relating to self-harm or harm to others, we retain the transcript for up to 30 days before permanent deletion. Crisis-flagged transcripts are not used for AI training or product improvement.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Contact</h2>
          <p>
            Questions about your data: <a href="mailto:hello@unloop.app" className="text-accent-selected hover:text-accent-hover">hello@unloop.app</a>
          </p>
        </div>
      </article>
    </main>
  );
}
