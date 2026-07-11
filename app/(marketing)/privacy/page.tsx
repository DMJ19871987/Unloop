import Link from "next/link";

export const metadata = {
  title: "Privacy - Unloop",
};

const EFFECTIVE_DATE = "11 July 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper px-6 py-16">
      <article className="prose prose-neutral mx-auto max-w-2xl">
        <Link href="/" className="mb-8 inline-block font-ui text-sm text-ink-faint no-underline hover:text-accent-selected">
          &larr; Back
        </Link>
        <h1 className="mb-2 font-heading text-3xl font-medium text-ink">Privacy policy</h1>
        <p className="mb-6 font-ui text-xs text-ink-faint">Effective {EFFECTIVE_DATE}</p>

        <div className="space-y-4 font-ui text-sm leading-relaxed text-ink-muted">
          <p>
            <strong>Controller:</strong> Unloop (contact:{" "}
            <a href="mailto:hello@unloop.app" className="text-accent-selected">hello@unloop.app</a>).
            We are the data controller for the account, loop, and session data described below.
          </p>

          <h2 className="pt-4 font-heading text-lg text-ink">What we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Account data:</strong> email, timezone, preferences, and billing status.</li>
            <li><strong>Offload data:</strong> optional retained transcripts, extracted loops, loop history, and session metadata.</li>
            <li><strong>Technical data:</strong> pseudonymous analytics when you consent, plus AI usage metrics that do not include offload content.</li>
          </ul>

          <h2 className="pt-4 font-heading text-lg text-ink">Voice and AI processing</h2>
          <p>
            Voice recordings are sent to OpenAI for transcription and are not saved in Unloop&apos;s
            database. OpenAI currently lists its audio-transcription endpoint as having no standard
            abuse-monitoring or application-state retention in its{" "}
            <a href="https://platform.openai.com/docs/models/default-usage-policies-by-endpoint" target="_blank" rel="noopener noreferrer" className="text-accent-selected">API data controls</a>.
            When you are offline, a recording may
            remain on your device for up to 24 hours until it is sent, discarded, or expires.
          </p>
          <p>
            The resulting transcript, together with relevant existing loop context, is sent to
            Anthropic to identify and update loops. Anthropic states in its{" "}
            <a href="https://privacy.anthropic.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data" target="_blank" rel="noopener noreferrer" className="text-accent-selected">commercial retention policy</a>{" "}
            that standard API inputs and outputs are deleted from its backend within 30 days,
            subject to safety, legal, and contractual exceptions.
          </p>
          <p>
            OpenAI and Anthropic state that commercial API inputs and outputs are not used to train
            their models by default unless a customer explicitly opts in or submits qualifying feedback.
          </p>

          <h2 className="pt-4 font-heading text-lg text-ink">Why we process data</h2>
          <p>
            We process account, loop, and offload data to provide the service you request and manage
            your subscription. Optional analytics operate only after consent. Offloads are free text
            and may contain sensitive information, so only submit content you are comfortable having
            processed for transcription and loop extraction.
          </p>

          <h2 className="pt-4 font-heading text-lg text-ink">Processors</h2>
          <p>
            Clerk (authentication), Stripe (payments), Neon (database), Vercel (hosting), OpenAI
            (transcription), Anthropic (loop extraction and weekly summaries), Resend (email), and
            PostHog EU (analytics, with consent). These providers may process data outside the UK under
            their contractual safeguards.
          </p>

          <h2 className="pt-4 font-heading text-lg text-ink">Retention</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Loops and account data: until you delete your account.</li>
            <li>Non-safety transcripts: while transcript storage is enabled. Turning it off also deletes previously retained non-safety transcripts from Unloop.</li>
            <li>Safety-flagged transcripts: up to 30 days, then removed by an automated purge.</li>
            <li>Offline queue audio: up to 24 hours on your device.</li>
            <li>Analytics: pseudonymous events according to our PostHog retention settings.</li>
            <li>Processor copies: according to each processor&apos;s retention policy and applicable exceptions.</li>
          </ul>

          <h2 className="pt-4 font-heading text-lg text-ink">Automated processing</h2>
          <p>
            AI identifies possible loops, matches them with existing loops, and suggests structure.
            This is not a medical or diagnostic assessment. You can edit, move, release, reopen, or
            delete loops after extraction, and consequential merge suggestions require confirmation.
          </p>

          <h2 className="pt-4 font-heading text-lg text-ink">Your choices and rights</h2>
          <p>
            Settings lets you stop retaining non-safety transcripts, export your account data, and
            permanently delete your Unloop account. Account deletion also clears queued audio on the
            device used to request deletion. Under UK data-protection law you may also ask to access,
            rectify, or erase personal data, subject to applicable exceptions.
          </p>
          <p>
            You may complain to the UK Information Commissioner&apos;s Office at{" "}
            <a href="https://ico.org.uk" className="text-accent-selected" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.
          </p>

          <h2 className="pt-4 font-heading text-lg text-ink">Safety-flagged transcripts</h2>
          <p>
            If safety checks flag content relating to self-harm or harm to others, Unloop retains the
            transcript for up to 30 days before automated deletion. This happens even when ordinary
            transcript storage is disabled. Safety-flagged transcripts are not used by Unloop for
            product improvement or model training.
          </p>

          <h2 className="pt-4 font-heading text-lg text-ink">Contact</h2>
          <p>
            Questions about your data:{" "}
            <a href="mailto:hello@unloop.app" className="text-accent-selected hover:text-accent-hover">hello@unloop.app</a>
          </p>
        </div>
      </article>
    </main>
  );
}
