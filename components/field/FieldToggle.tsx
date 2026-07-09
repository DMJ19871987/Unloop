"use client";

import Link from "next/link";

interface FieldToggleProps {
  view: "occupying" | "released";
}

export function FieldToggle({ view }: FieldToggleProps) {
  return (
    <Link
      href={view === "occupying" ? "/record" : "/field"}
      className="inline-flex rounded-full border border-border px-3 py-1.5 font-ui text-xs text-ink-faint min-h-[36px] items-center"
    >
      <span className={view === "occupying" ? "text-accent-selected font-medium" : ""}>
        Occupying you
      </span>
      <span className="mx-1.5">/</span>
      <span className={view === "released" ? "text-accent-selected font-medium" : ""}>
        Released
      </span>
    </Link>
  );
}
