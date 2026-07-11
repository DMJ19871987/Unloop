"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { DummyDataProvider } from "@/components/providers/DummyDataProvider";
import { DummyDataToggle } from "@/components/app/DummyDataToggle";
import { SubscriptionBanner } from "@/components/app/SubscriptionBanner";
import { SubscriptionGate } from "@/components/app/SubscriptionGate";
import { PostHogUserIdentify } from "@/components/providers/PostHogUserIdentify";
import type { SubscriptionAccess } from "@/lib/auth/subscription";

const showDevTools =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_DEV_TOOLS === "true";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const NAV_ITEMS = [
  { href: "/field", label: "Field" },
  { href: "/offload", label: "Offload" },
  { href: "/record", label: "Record" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [access, setAccess] = useState<SubscriptionAccess>("full");
  const [subscriptionStatus, setSubscriptionStatus] = useState("trialing");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.subscriptionAccess) setAccess(data.subscriptionAccess);
        if (data.subscriptionStatus) setSubscriptionStatus(data.subscriptionStatus);
      })
      .catch(() => {});
  }, []);

  return (
    <DummyDataProvider>
      {hasClerk && <PostHogUserIdentify />}
      <SubscriptionGate>
        <div className="min-h-screen app-atmosphere flex flex-col">
          <SubscriptionBanner access={access} subscriptionStatus={subscriptionStatus} />
          <header className="sticky top-0 z-30 flex min-h-[64px] items-center justify-between gap-4 border-b border-border/70 bg-paper/82 px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl sm:px-7">
            <Link
              href="/field"
              className="shrink-0 font-heading text-lg tracking-[0.01em] text-ink"
              aria-label="Unloop field"
            >
              Unloop
            </Link>

            <nav className="hidden items-center gap-1 font-ui text-sm sm:flex" aria-label="Primary navigation">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative min-h-[44px] px-4 inline-flex items-center transition-colors ${
                      active ? "text-accent-selected" : "text-ink-faint hover:text-ink"
                    }`}
                  >
                    {item.label}
                    {active && (
                      <span className="absolute inset-x-4 bottom-0 h-px bg-accent" aria-hidden />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="flex min-w-[36px] items-center justify-end gap-3">
              {showDevTools && <DummyDataToggle />}
              {hasClerk && <UserButton afterSignOutUrl="/" />}
            </div>
          </header>

          <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
            {children}
          </main>

          <nav
            className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border/80 bg-paper/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(43,39,36,0.06)] backdrop-blur-xl sm:hidden"
            aria-label="Primary navigation"
          >
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 font-ui text-[11px] transition-colors ${
                    active ? "text-accent-selected" : "text-ink-faint"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full transition-all ${
                      active ? "bg-accent scale-100" : "bg-border scale-75"
                    }`}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </SubscriptionGate>
    </DummyDataProvider>
  );
}
