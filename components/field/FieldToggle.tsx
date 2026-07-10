"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";

interface FieldToggleProps {
  view: "occupying" | "released";
}

export function FieldToggle({ view }: FieldToggleProps) {
  const targetView = view === "occupying" ? "released" : "occupying";

  return (
    <Link
      href={view === "occupying" ? "/record" : "/field"}
      onClick={() => track("field_toggle_used", { view: targetView })}
      className="inline-flex rounded-full border border-border/80 bg-sheet/72 px-3 py-1.5 font-ui text-xs text-ink-faint min-h-[48px] items-center shadow-subtle backdrop-blur transition hover:border-accent/40 hover:text-ink-soft"
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
