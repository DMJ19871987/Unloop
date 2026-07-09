"use client";

export function CrisisCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="crisis-title"
      className="mx-6 mb-4 bg-sheet border border-border rounded-2xl px-5 py-4"
    >
      <p id="crisis-title" className="font-ui text-sm text-ink-soft leading-relaxed">
        Some of what you said sounds heavy. Unloop is a place to set thoughts down, not a
        source of support — if things feel like too much, talking to someone you trust or a
        professional can genuinely help. In the UK you can call or text Samaritans on 116 123,
        any time.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-4 font-ui text-sm text-accent-selected hover:text-accent-hover min-h-[48px]"
      >
        Understood
      </button>
    </div>
  );
}
