"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "Is this a to-do app?",
    a: "No. Unloop is a visual decompression tool for unresolved thoughts. There are no checkboxes, due dates, or lists. You close loops by achieving mental closure — not by ticking tasks off.",
  },
  {
    q: "What happens to my audio?",
    a: "Audio is sent to OpenAI for transcription and is not saved in Unloop's database. When you are offline, a recording may wait on your device for up to 24 hours until it is sent or discarded. The transcript is sent to Anthropic to identify loops. You can choose not to keep non-safety transcripts in Unloop.",
  },
  {
    q: "Can I type instead of speaking?",
    a: "Yes. A quiet typed offload option is available for moments when speaking isn't practical.",
  },
  {
    q: "What if I have loads of loops?",
    a: "The field keeps a calm selection visible across Ready, Clarify, and Waiting. When it gets dense, additional loops remain available in the searchable Field index instead of being squeezed into the canvas.",
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
