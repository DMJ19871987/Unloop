import Link from "next/link";

export const metadata = {
  title: "Terms — Unloop",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-paper px-6 py-16">
      <article className="max-w-2xl mx-auto prose prose-neutral">
        <Link
          href="/"
          className="font-ui text-sm text-ink-faint hover:text-accent-selected mb-8 inline-block no-underline"
        >
          ← Back
        </Link>
        <h1 className="font-heading text-3xl font-medium text-ink mb-6">Terms of use</h1>

        <div className="font-ui text-ink-muted space-y-4 text-sm leading-relaxed">
          <p>
            These terms apply when you use Unloop, operated from the United Kingdom. By creating an
            account or using the service, you agree to them.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">What Unloop is</h2>
          <p>
            Unloop is a visual thinking tool for mental offload. You speak or type what is on your
            mind; we transcribe it, identify open loops, and help you close, contain, or set them
            down. Unloop is not therapy, counselling, or a health service. It does not diagnose,
            treat, or provide clinical support. If you need help with your mental health, please
            contact a qualified professional or a crisis line.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Your account</h2>
          <p>
            You must provide accurate contact details and keep your login secure. You are
            responsible for activity under your account. You must be at least 16 years old to use
            Unloop.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Subscription and trial</h2>
          <p>
            Unloop is a paid service with a 7-day free trial on annual and monthly plans. A valid
            payment method is required when you start a trial. Unless you cancel before the trial
            ends, your subscription renews automatically at the price shown at checkout. Founding
            Member lifetime access is a one-time payment with a limited number of places.
          </p>
          <p>
            You can cancel or change your plan at any time through the billing portal in Settings.
            Cancellation takes effect at the end of the current billing period. We do not delete
            your loops when a subscription lapses; the field becomes read-only until you renew.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Acceptable use</h2>
          <p>
            Use Unloop for personal mental offload only. Do not attempt to reverse-engineer the
            service, scrape other users&apos; data, or use the product to harass others. Do not rely
            on Unloop for emergency or crisis support.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Availability and changes</h2>
          <p>
            We aim to keep Unloop available but do not guarantee uninterrupted access. We may
            update features or these terms; material changes will be communicated by email or
            in-app notice where practicable.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Liability</h2>
          <p>
            Unloop is provided &quot;as is&quot; to the extent permitted by law. We are not liable
            for indirect or consequential loss arising from your use of the service. Nothing in
            these terms limits your statutory rights as a consumer in the United Kingdom.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Governing law</h2>
          <p>
            These terms are governed by the laws of England and Wales. Disputes are subject to the
            exclusive jurisdiction of the courts of England and Wales.
          </p>

          <h2 className="font-heading text-lg text-ink pt-4">Contact</h2>
          <p>
            Questions about these terms:{" "}
            <a
              href="mailto:hello@unloop.app"
              className="text-accent-selected hover:text-accent-hover"
            >
              hello@unloop.app
            </a>
          </p>
        </div>
      </article>
    </main>
  );
}
