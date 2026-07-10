import Link from "next/link";

export const metadata = {
  title: "Privacy — Unloop",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper px-6 py-16">
      <article className="max-w-2xl mx-auto prose prose-neutral">
        <Link href="/" className="font-ui text-sm text-ink-faint hover:text-accent-selected mb-8 inline-block no-underline">
          ← Back
        </Link>
        <h1 className="font-heading text-3xl font-medium text-ink mb-6">Privacy policy</h1>

        <div className="font-ui text-ink-muted space-y-4 text-sm leading-relaxed">
          <p>
            Unloop is built around a simple promise: your thoughts are yours. We help you offload them, see them as loops, and set them down. We do not sell your data, train AI on your content, or keep your voice recordings.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">What we collect</h2>
          <p>
            When you create an account, we store your email and preferences. When you offload, we transcribe your voice and extract loops from the transcript. The audio is discarded immediately — we never store recordings.
          </p>
          <p>
            Transcripts are kept to help match loops across sessions (so &quot;the garden&quot; on Tuesday is the same loop as Sunday). You can disable transcript storage in settings.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Processors</h2>
          <p>
            We use Neon (database), Vercel (hosting), Clerk (authentication), Stripe (payments), Anthropic and OpenAI (AI processing), PostHog EU (analytics), and Resend (email). Each processes data only to provide the service.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">AI and training</h2>
          <p>
            Your thoughts are never used to train AI models. Transcripts and loops are sent to AI providers only for extraction and summaries, then stored in your account.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Your rights</h2>
          <p>
            Under UK GDPR, you can export all your data or delete your account entirely from settings. Deletion is permanent and removes your loops, events, transcripts, and account.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Crisis-flagged transcripts</h2>
          <p>
            If our safety checks flag content relating to self-harm or harm to others, we retain the
            transcript for up to 30 days before permanently deleting it. This retention supports
            safety review and is handled as special-category health data under UK GDPR. We do not use
            crisis-flagged transcripts for AI training or product improvement. See our terms for how
            Unloop relates to professional support.
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
