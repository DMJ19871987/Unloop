import { LoopCircle } from "@/components/field/LoopCircle";

const STEPS = [
  {
    number: "01",
    title: "Empty your head",
    description: "Speak for a moment or type quietly. No structure, categories, or perfect wording needed.",
    visual: "capture" as const,
  },
  {
    number: "02",
    title: "See what's occupying you",
    description: "Unloop identifies the open threads it hears and turns them into loops you can review.",
    visual: "field" as const,
  },
  {
    number: "03",
    title: "Choose what happens next",
    description: "Give a loop a next step, park it, mark it done, or release it without making another list.",
    visual: "sheet" as const,
  },
];

function StepVisual({ type }: { type: "capture" | "field" | "sheet" }) {
  if (type === "capture") {
    return (
      <div className="relative flex h-40 items-center justify-center overflow-hidden field-surface">
        <p className="absolute inset-x-6 top-5 text-center font-ui text-xs leading-relaxed text-ink-faint">
          “I keep thinking about the conversation with Maya…”
        </p>
        <div className="relative mt-8 h-20 w-20">
          <div className="absolute inset-0 animate-pulse rounded-full bg-accent-breathe shadow-soft" />
          <div className="absolute inset-3 flex items-center justify-center rounded-full bg-accent-button shadow-[var(--shadow-inset)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-selected)" strokeWidth="1.5" aria-hidden>
              <rect x="9" y="2.5" width="6" height="11" rx="3" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
              <line x1="12" y1="17.5" x2="12" y2="21" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (type === "field") {
    return (
      <div className="relative h-40 overflow-hidden field-surface">
        <div className="absolute left-[20%] top-[18%]">
          <LoopCircle label="Talk to Maya" state="open_attention" weight={4} emotionalIntensity={3} visualSeed={91} size={52} labelMaxWidth={92} compactLabel drift />
        </div>
        <div className="absolute right-[14%] top-[45%]">
          <LoopCircle label="Book dentist" state="next_step_known" weight={2} emotionalIntensity={1} visualSeed={64} size={38} labelMaxWidth={80} compactLabel drift />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-40 items-end justify-center bg-[color-mix(in_srgb,var(--accent-tint)_22%,transparent)] px-5">
      <div className="w-full max-w-[230px] rounded-t-2xl border border-b-0 border-border bg-sheet p-4 shadow-soft">
        <div className="mx-auto h-1 w-8 rounded bg-border" />
        <p className="mt-3 text-center font-heading text-sm text-ink">Talk to Maya</p>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {["Done", "Next step", "Park"].map((action) => (
            <span key={action} className="rounded-full border border-border px-1.5 py-1.5 text-center text-[9px] text-ink-soft">
              {action}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BenefitCards() {
  return (
    <div className="grid border-y border-border md:grid-cols-3">
      {STEPS.map((step, index) => (
        <article key={step.title} className={`py-7 md:px-7 ${index > 0 ? "border-t border-border md:border-l md:border-t-0" : ""}`}>
          <StepVisual type={step.visual} />
          <p className="mt-6 font-ui text-[10px] tracking-[2px] text-accent-selected">{step.number}</p>
          <h3 className="mt-2 font-heading text-xl font-medium text-ink">{step.title}</h3>
          <p className="mt-3 font-ui text-sm leading-relaxed text-ink-muted">{step.description}</p>
        </article>
      ))}
    </div>
  );
}
