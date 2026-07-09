"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "Is this a to-do app?",
    a: "No. Unloop is a visual decompression tool for unresolved thoughts. There are no checkboxes, due dates, or lists. You close loops by achieving mental closure — not by ticking tasks off.",
  },
  {
    q: "What happens to my audio?",
    a: "Your voice is transcribed and the audio is immediately deleted. We never store recordings. Only the transcript is kept, and you can turn that off in settings.",
  },
  {
    q: "Can I type instead of speaking?",
    a: "Yes. A quiet typed offload option is available for moments when speaking isn't practical.",
  },
  {
    q: "What if I have loads of loops?",
    a: "The field adapts. Parked loops settle to the edges. When things get dense, older parked loops compress into a gentle cluster you can expand when ready.",
  },
  {
    q: "How do I cancel?",
    a: "Any time from settings, via the billing portal. Your data stays until you choose to delete it.",
  },
  {
    q: "Is this therapy?",
    a: "No — Unloop is a thinking tool, not a health service. It helps you see and set down what's occupying your head. It does not diagnose, treat, or advise on mental health.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, i) => (
        <div key={item.q} className="border border-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full px-5 py-4 text-left font-ui text-sm text-ink flex justify-between items-center min-h-[48px] hover:bg-sheet transition-colors"
            aria-expanded={openIndex === i}
          >
            {item.q}
            <span className="text-ink-faint text-lg leading-none">
              {openIndex === i ? "−" : "+"}
            </span>
          </button>
          {openIndex === i && (
            <div className="px-5 pb-4 font-ui text-sm text-ink-muted leading-relaxed">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
