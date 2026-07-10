"use client";

interface ReleasePassBannerProps {
  count: number;
  onDismiss: () => void;
}

export function ReleasePassBanner({ count, onDismiss }: ReleasePassBannerProps) {
  return (
    <div className="mx-6 mb-4 bg-sheet border border-border rounded-2xl px-5 py-4">
      <p className="font-ui text-sm text-ink-soft leading-relaxed">
        You have {count} open loops — the field is getting full. A gentle release pass might
        help: tap through a few and decide what can be set down.
      </p>
      <div className="flex gap-3 mt-3">
        <a
          href="/record"
          className="px-4 py-2 rounded-full bg-accent text-white font-ui text-sm min-h-[48px] inline-flex items-center"
        >
          Release pass
        </a>
        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2 rounded-full border border-border font-ui text-sm text-ink-soft min-h-[48px]"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
