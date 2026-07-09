import Link from "next/link";
import { HeroFieldDemo } from "./HeroFieldDemo";
import { BenefitCards } from "./BenefitCards";
import { PricingTable } from "./PricingTable";
import { FaqAccordion } from "./FaqAccordion";
import { WaitlistForm } from "./WaitlistForm";
import { isPrelaunch } from "@/lib/stripe/config";

export function Hero() {
  const prelaunch = isPrelaunch();

  return (
    <section className="px-6 py-16 md:py-24 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <div className="space-y-6">
          <h1 className="font-heading text-4xl md:text-5xl font-semibold text-ink tracking-tight text-balance">
            Empty your head.
          </h1>
          <p className="font-ui text-lg text-ink-muted leading-relaxed max-w-md">
            Speak freely. Unloop turns the swirl into a calm field of open loops — and helps you close them, contain them, or set them down.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {prelaunch ? (
              <WaitlistForm variant="hero" />
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-accent text-white font-ui text-sm font-medium hover:opacity-90 transition-opacity min-h-[48px]"
                >
                  Start unlooping — 7 days free
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-border text-ink-soft font-ui text-sm hover:text-accent-selected transition-colors min-h-[48px]"
                >
                  See how it works
                </a>
              </>
            )}
          </div>
          {!prelaunch && (
            <p className="font-ui text-sm text-ink-faint pt-1">
              Already using Unloop?{" "}
              <Link href="/sign-in" className="text-accent-selected hover:text-accent-hover">
                Sign in
              </Link>
            </p>
          )}
        </div>
        <HeroFieldDemo />
      </div>
    </section>
  );
}

export function PullQuote() {
  return (
    <section className="px-6 py-14 bg-accent-tint/30">
      <blockquote className="max-w-3xl mx-auto text-center">
        <p className="font-heading text-xl md:text-2xl text-ink leading-relaxed">
          Your working memory isn&apos;t storage. Every open loop you&apos;re holding is rented headspace.
        </p>
      </blockquote>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-16 max-w-6xl mx-auto">
      <h2 className="font-heading text-2xl font-medium text-ink mb-10 text-center">
        How it works
      </h2>
      <BenefitCards />
    </section>
  );
}

export function ScienceBand() {
  return (
    <section className="px-6 py-14 max-w-3xl mx-auto text-center">
      <p className="font-ui text-ink-muted leading-relaxed">
        Unfinished thoughts tend to stay with you more than finished ones — psychologists call this the Zeigarnik effect. Naming what&apos;s occupying you, and articulating a concrete next step, can quiet a loop almost as well as completing it. Unloop is built around that.
      </p>
    </section>
  );
}

export function RecordSection() {
  return (
    <section className="px-6 py-16 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div className="relative aspect-square max-w-sm mx-auto bg-paper border border-border rounded-2xl p-8 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-flex rounded-full border border-border px-4 py-2 font-ui text-sm text-ink-soft">
              <span className="text-accent-selected font-medium">Occupying you</span>
              <span className="mx-2 text-ink-faint">/</span>
              <span>Released</span>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-full border-2 border-closed opacity-60"
                  style={{
                    width: 20 + i * 8,
                    height: 20 + i * 8,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="font-heading text-2xl font-medium text-ink">
            Watch the released pile grow
          </h2>
          <p className="font-ui text-ink-muted leading-relaxed">
            Proof your head has been doing the work. Every loop you close, contain, or set down stays in your record — evidence that the swirl is reducing.
          </p>
        </div>
      </div>
    </section>
  );
}

export function PrivacyBand() {
  return (
    <section className="px-6 py-14 bg-ink text-paper">
      <div className="max-w-3xl mx-auto text-center space-y-3">
        <h2 className="font-heading text-xl font-medium">Spoken, structured, deleted.</h2>
        <p className="font-ui text-sm leading-relaxed opacity-90">
          Your audio is transcribed and immediately discarded. Your thoughts are never used to train AI. Export or erase everything, any time.
        </p>
      </div>
    </section>
  );
}

export function PricingSection() {
  const prelaunch = isPrelaunch();

  return (
    <section id="pricing" className="px-6 py-16 max-w-6xl mx-auto">
      <h2 className="font-heading text-2xl font-medium text-ink mb-2 text-center">
        Simple pricing
      </h2>
      <p className="font-ui text-ink-faint text-center mb-10 text-sm">
        7-day free trial. Cancel any time.
      </p>
      {prelaunch ? (
        <div className="max-w-md mx-auto">
          <WaitlistForm variant="pricing" />
        </div>
      ) : (
        <PricingTable />
      )}
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="px-6 py-16 max-w-2xl mx-auto">
      <h2 className="font-heading text-2xl font-medium text-ink mb-8 text-center">
        Questions
      </h2>
      <FaqAccordion />
    </section>
  );
}

export function Footer() {
  return (
    <footer className="px-6 py-10 border-t border-border">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="font-heading text-lg text-ink">Unloop</span>
        <nav className="flex gap-6 font-ui text-sm text-ink-faint">
          <Link href="/sign-in" className="hover:text-accent-selected transition-colors">
            Sign in
          </Link>
          <Link href="/privacy" className="hover:text-accent-selected transition-colors">
            Privacy
          </Link>
          <a href="mailto:hello@unloop.app" className="hover:text-accent-selected transition-colors">
            Contact
          </a>
        </nav>
        <span className="font-ui text-xs text-ink-faint">
          © {new Date().getFullYear()} Unloop
        </span>
      </div>
    </footer>
  );
}
