import Link from "next/link";
import { isPrelaunch } from "@/lib/stripe/config";

export function MarketingHeader() {
  const prelaunch = isPrelaunch();

  return (
    <header className="sticky top-0 z-30 px-6 py-4 border-b border-border/70 bg-paper/78 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <Link href="/" className="font-heading text-lg text-ink">
          Unloop
        </Link>
        <nav className="flex items-center gap-4 font-ui text-sm">
          <Link
            href="/sign-in"
            className="text-ink-faint hover:text-ink transition-colors min-h-[48px] inline-flex items-center"
          >
            Sign in
          </Link>
          {!prelaunch && (
            <Link
              href="/sign-up"
            className="inline-flex items-center px-4 py-2 rounded-full bg-accent text-white hover:bg-accent-hover transition-colors min-h-[48px] shadow-subtle"
            >
              Start free trial
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
