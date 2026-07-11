"use client";

import Link from "next/link";
import { LoopCircle } from "@/components/field/LoopCircle";
import { HeroFieldDemo } from "./HeroFieldDemo";
import { BenefitCards } from "./BenefitCards";
import { PricingTable } from "./PricingTable";
import { FaqAccordion } from "./FaqAccordion";
import { WaitlistForm } from "./WaitlistForm";
import { isPrelaunch } from "@/lib/stripe/config";
import { track } from "@/lib/analytics";

const RECOGNITION_EXAMPLES = [
  "The conversation you keep rehearsing",
  "The decision you have not made",
  "The reply you are waiting for",
  "The idea you do not want to lose",
];

const RELEASED_LOOPS = [
  { label: "Called the bank", state: "done" as const, weight: 4, seed: 114, left: "18%", top: "22%" },
  { label: "Sent the application", state: "done" as const, weight: 5, seed: 229, left: "68%", top: "18%" },
  { label: "Let the garden wait", state: "released" as const, weight: 3, seed: 347, left: "40%", top: "54%" },
  { label: "Replied to Sam", state: "done" as const, weight: 2, seed: 458, left: "78%", top: "63%" },
  { label: "Chose a date", state: "released" as const, weight: 3, seed: 571, left: "18%", top: "78%" },
];

export function Hero() {
  const prelaunch = isPrelaunch();

  return (
    <section className="relative mx-auto max-w-7xl overflow-hidden px-6 pb-20 pt-14 md:px-10 md:pb-28 md:pt-20">
      <div className="pointer-events-none absolute inset-x-4 top-10 h-80 field-surface opacity-70" aria-hidden />
      <div className="relative grid items-center gap-12 md:grid-cols-[0.92fr_1.08fr] md:gap-16 lg:gap-24">
        <div className="animate-float-in">
          <p className="font-ui text-[10px] uppercase tracking-[3px] text-ink-placeholder">
            Voice-first mental offload
          </p>
          <h1 className="mt-6 max-w-xl text-balance font-heading text-5xl font-semibold leading-[1.02] text-ink md:text-6xl lg:text-[68px]">
            Empty your head.
          </h1>
          <p className="mt-6 max-w-lg font-ui text-lg leading-relaxed text-ink-muted">
            Say what is circling. Unloop turns it into a living field of open loops, then helps you
            decide what can move, wait, or be released.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {prelaunch ? (
              <WaitlistForm variant="hero" />
            ) : (
              <>
                <Link
                  href="/sign-up"
                  onClick={() => track("signup_started", { source: "hero" })}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-accent px-6 py-3 font-ui text-sm font-medium text-white shadow-soft transition-colors hover:bg-accent-hover"
                >
                  Start unlooping — 7 days free
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-border bg-sheet/55 px-6 py-3 font-ui text-sm text-ink-soft transition-colors hover:border-accent/40 hover:text-accent-selected"
                >
                  See how it works
                </a>
              </>
            )}
          </div>
          {!prelaunch && (
            <div className="mt-5 space-y-2">
              <p className="font-ui text-xs leading-relaxed text-ink-faint">
                Card required. Cancel before day 7 and you will not be charged.
              </p>
              <p className="font-ui text-sm text-ink-faint">
                Already using Unloop?{" "}
                <Link href="/sign-in" className="text-accent-selected hover:text-accent-hover">Sign in</Link>
              </p>
            </div>
          )}
        </div>
        <div className="animate-float-in [animation-delay:120ms]">
          <HeroFieldDemo />
        </div>
      </div>
    </section>
  );
}

export function PullQuote() {
  return (
    <section className="border-y border-border/70 bg-[#e8ede7] px-6 py-16 text-[#283029] md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
          <div>
            <p className="font-ui text-[10px] uppercase tracking-[3px] text-[#667168]">The mental load between tasks</p>
            <h2 className="mt-4 max-w-md text-balance font-heading text-3xl font-medium leading-tight md:text-4xl">
              Not everything occupying you belongs on a to-do list.
            </h2>
          </div>
          <div className="border-y border-[#c7d0c7]">
            {RECOGNITION_EXAMPLES.map((example, index) => (
              <div key={example} className={`grid grid-cols-[28px_1fr] items-center gap-4 py-4 ${index > 0 ? "border-t border-[#c7d0c7]" : ""}`}>
                <span className="h-4 w-4 rounded-full border border-[#879388]" aria-hidden />
                <span className="font-heading text-lg text-[#354038]">{example}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20 md:py-24">
      <div className="mb-12 max-w-xl">
        <p className="font-ui text-[10px] uppercase tracking-[3px] text-ink-placeholder">From swirl to field</p>
        <h2 className="mt-4 font-heading text-3xl font-medium text-ink">A little room to think again.</h2>
      </div>
      <BenefitCards />
    </section>
  );
}

export function ScienceBand() {
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-6 py-20 md:grid-cols-[0.65fr_1.35fr] md:gap-20 md:py-24">
      <div>
        <p className="font-ui text-[10px] uppercase tracking-[3px] text-ink-placeholder">The thinking behind Unloop</p>
        <h2 className="mt-4 font-heading text-3xl font-medium text-ink">Grounded, not overstated.</h2>
      </div>
      <div>
        <p className="font-ui text-base leading-relaxed text-ink-muted">
          Some research suggests unfinished goals can intrude on attention, and that making a
          specific plan may reduce that interference. Evidence for the classic Zeigarnik memory
          effect is mixed. Unloop uses these ideas as design inspiration, not as a clinical claim.
        </p>
        <div className="mt-6 flex flex-col gap-3 font-ui text-sm sm:flex-row sm:gap-6">
          <a href="https://pubmed.ncbi.nlm.nih.gov/21688924/" target="_blank" rel="noopener noreferrer" className="text-accent-selected underline decoration-accent/40 underline-offset-4 hover:text-accent-hover">
            Planning and intrusive thoughts
          </a>
          <a href="https://www.nature.com/articles/s41599-025-05000-w" target="_blank" rel="noopener noreferrer" className="text-accent-selected underline decoration-accent/40 underline-offset-4 hover:text-accent-hover">
            2025 evidence review
          </a>
        </div>
      </div>
    </section>
  );
}

export function RecordSection() {
  return (
    <section className="border-y border-border/70 bg-sheet/45 px-6 py-20 md:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[1.1fr_0.9fr] md:gap-20">
        <div className="relative min-h-[460px] overflow-hidden rounded-[28px] border border-border bg-paper shadow-soft field-surface">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-border/70 px-5 py-4">
            <div>
              <p className="font-ui text-[9px] uppercase tracking-[2px] text-ink-placeholder">Your record</p>
              <p className="mt-1 font-heading text-lg text-ink">Released</p>
            </div>
            <span className="font-ui text-xs text-ink-faint">18 loops set down</span>
          </div>
          <div className="absolute inset-x-0 bottom-[122px] top-[72px]">
            {RELEASED_LOOPS.map((loop) => (
              <div key={loop.label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: loop.left, top: loop.top }}>
                <LoopCircle label="" state={loop.state} weight={loop.weight} emotionalIntensity={2} visualSeed={loop.seed} size={36 + loop.weight * 4} arc={1} showLabel={false} stroke={loop.state === "done" ? "var(--accent)" : "var(--closed)"} drift />
              </div>
            ))}
          </div>
          <div className="absolute inset-x-5 bottom-0 border-t border-border/70 py-3">
            {["Sent the application", "Let the garden wait"].map((label, index) => (
              <div key={label} className={`flex items-center justify-between py-2 ${index > 0 ? "border-t border-border-soft" : ""}`}>
                <span className="font-heading text-sm text-ink-soft">{label}</span>
                <span className="font-ui text-[10px] text-ink-placeholder">{index === 0 ? "Today" : "Yesterday"}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="font-ui text-[10px] uppercase tracking-[3px] text-ink-placeholder">Closure without completion theatre</p>
          <h2 className="mt-4 text-balance font-heading text-3xl font-medium leading-tight text-ink md:text-4xl">
            A quiet record of what you no longer need to carry.
          </h2>
          <p className="mt-5 font-ui text-base leading-relaxed text-ink-muted">
            Every loop you mark done or deliberately release remains in History. Search it, revisit
            what changed, or reopen something when life changes its mind.
          </p>
        </div>
      </div>
    </section>
  );
}

export function PrivacyBand() {
  return (
    <section className="bg-[#e8ede7] px-6 py-20 text-[#283029] md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="font-ui text-[10px] uppercase tracking-[3px] text-[#667168]">Privacy, in plain English</p>
          <h2 className="mt-4 text-balance font-heading text-3xl font-medium leading-tight md:text-4xl">
            Clear about what leaves your device.
          </h2>
        </div>
        <div className="mt-10 grid border-y border-[#c7d0c7] md:grid-cols-3">
          <div className="py-6 md:pr-7">
            <h3 className="font-heading text-lg">Audio</h3>
            <p className="mt-3 font-ui text-sm leading-relaxed text-[#5b675e]">Sent to OpenAI for transcription and not saved in Unloop’s database. Offline audio can remain on this device for up to 24 hours.</p>
          </div>
          <div className="border-t border-[#c7d0c7] py-6 md:border-l md:border-t-0 md:px-7">
            <h3 className="font-heading text-lg">AI processing</h3>
            <p className="mt-3 font-ui text-sm leading-relaxed text-[#5b675e]">Transcripts are sent to Anthropic to identify and update loops. Its standard commercial API retention can be up to 30 days.</p>
          </div>
          <div className="border-t border-[#c7d0c7] py-6 md:border-l md:border-t-0 md:pl-7">
            <h3 className="font-heading text-lg">Your controls</h3>
            <p className="mt-3 font-ui text-sm leading-relaxed text-[#5b675e]">Choose whether Unloop keeps non-safety transcripts. Export your account data or permanently delete your account from Settings.</p>
          </div>
        </div>
        <p className="mt-6 max-w-3xl font-ui text-xs leading-relaxed text-[#667168]">
          OpenAI and Anthropic state that commercial API content is not used to train their models by default. Safety and legal exceptions may apply.{" "}
          <Link href="/privacy" className="font-medium text-[#455248] underline underline-offset-4 hover:text-[#283029]">Read the full privacy policy</Link>
        </p>
      </div>
    </section>
  );
}

export function PricingSection() {
  const prelaunch = isPrelaunch();
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-20 md:py-24">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <p className="font-ui text-[10px] uppercase tracking-[3px] text-ink-placeholder">Simple pricing</p>
        <h2 className="mt-4 font-heading text-3xl font-medium text-ink">Make some room in your head.</h2>
        <p className="mt-3 font-ui text-sm text-ink-faint">7-day free trial. Card required. Cancel any time.</p>
      </div>
      {prelaunch ? <div className="mx-auto max-w-md"><WaitlistForm variant="pricing" /></div> : <PricingTable />}
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-20 md:py-24">
      <p className="text-center font-ui text-[10px] uppercase tracking-[3px] text-ink-placeholder">Before you begin</p>
      <h2 className="mb-8 mt-4 text-center font-heading text-3xl font-medium text-ink">Questions</h2>
      <FaqAccordion />
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <span className="font-heading text-lg text-ink">Unloop</span>
        <nav className="flex flex-wrap justify-center gap-6 font-ui text-sm text-ink-faint" aria-label="Footer">
          <Link href="/sign-in" className="transition-colors hover:text-accent-selected">Sign in</Link>
          <Link href="/privacy" className="transition-colors hover:text-accent-selected">Privacy</Link>
          <Link href="/terms" className="transition-colors hover:text-accent-selected">Terms</Link>
          <a href="https://www.tiktok.com/@unloopapp" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent-selected">TikTok</a>
          <a href="https://www.instagram.com/unloopapp" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent-selected">Instagram</a>
          <a href="mailto:hello@unloop.app" className="transition-colors hover:text-accent-selected">Contact</a>
        </nav>
        <span className="font-ui text-xs text-ink-faint">© {new Date().getFullYear()} Unloop</span>
      </div>
    </footer>
  );
}
