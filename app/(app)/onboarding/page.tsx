"use client";

import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-6 max-w-sm mx-auto">
      <h1 className="font-heading text-2xl font-medium text-ink">Your head isn&apos;t storage.</h1>
      <p className="font-ui text-ink-muted text-sm leading-relaxed">
        Speak freely. Unloop finds the loops. Close them, contain them, or set them down.
      </p>
      <Link
        href="/offload"
        className="px-6 py-3 rounded-full bg-accent text-white font-ui text-sm min-h-[48px] inline-flex items-center"
      >
        Begin
      </Link>
    </div>
  );
}
