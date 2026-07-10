const CARDS = [
  {
    title: "Empty your head",
    description: "Talk for two minutes. No structure needed.",
    visual: "capture" as const,
  },
  {
    title: "See what's occupying you",
    description: "Every unresolved thing becomes a loop. Big and bold means it's taking space.",
    visual: "field" as const,
  },
  {
    title: "Close it, contain it, or set it down",
    description: "Done, next-step-known, parked, or released. Closure without a to-do list.",
    visual: "sheet" as const,
  },
];

function CardVisual({ type }: { type: "capture" | "field" | "sheet" }) {
  if (type === "capture") {
    return (
      <div className="flex items-center justify-center h-32 field-surface rounded-2xl">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-accent-breathe animate-pulse shadow-soft" />
          <div className="absolute inset-3 rounded-full bg-accent-button flex items-center justify-center shadow-[var(--shadow-inset)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-selected)" strokeWidth="1.5">
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
      <div className="relative h-32 flex items-center justify-center field-surface rounded-2xl">
        <div className="absolute w-14 h-14 rounded-full border-[3px] border-accent opacity-80" style={{ borderStyle: "dashed" }} />
        <div className="absolute w-10 h-10 rounded-full border-2 border-closed opacity-70 translate-x-8 -translate-y-4" style={{ borderStyle: "dashed" }} />
        <div className="absolute w-6 h-6 rounded-full border border-ink-placeholder opacity-40 -translate-x-10 translate-y-6" />
      </div>
    );
  }

  return (
    <div className="h-32 flex items-end justify-center pb-2">
      <div className="w-full max-w-[200px] glass-panel rounded-t-2xl p-3 space-y-2">
        <div className="w-8 h-1 bg-border rounded mx-auto" />
        <div className="flex flex-wrap gap-1.5 justify-center">
          {["I've done it", "Next step", "Later"].map((pill) => (
            <span key={pill} className="px-2 py-1 text-[10px] rounded-full border border-border text-ink-soft">
              {pill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BenefitCards() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {CARDS.map((card) => (
        <div
          key={card.title}
          className="glass-panel rounded-[24px] p-6 space-y-3 transition duration-300 hover:-translate-y-1"
        >
          <CardVisual type={card.visual} />
          <h3 className="font-heading text-lg font-medium text-ink">{card.title}</h3>
          <p className="font-ui text-sm text-ink-muted leading-relaxed">{card.description}</p>
        </div>
      ))}
    </div>
  );
}
