"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { DummyDataProvider } from "@/components/providers/DummyDataProvider";
import { DummyDataToggle } from "@/components/app/DummyDataToggle";
import { SubscriptionBanner } from "@/components/app/SubscriptionBanner";
import { SubscriptionGate } from "@/components/app/SubscriptionGate";
import { PostHogUserIdentify } from "@/components/providers/PostHogUserIdentify";
import type { SubscriptionAccess } from "@/lib/auth/subscription";

const showDevNav =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_DEV_TOOLS === "true";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function AppShell({ children }: { children: React.ReactNode }) {
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
          {showDevNav && (
            <header className="sticky top-0 z-30 flex items-center justify-between px-5 sm:px-7 py-3 border-b border-border/70 gap-4 pt-[env(safe-area-inset-top)] bg-paper/78 backdrop-blur-xl">
              <Link href="/field" className="font-heading text-lg text-ink shrink-0 tracking-[0.01em]">
                Unloop
              </Link>
              <nav className="flex items-center gap-2 font-ui text-sm text-ink-faint flex-wrap justify-end">
                <DummyDataToggle />
                <Link href="/field" className="rounded-full px-3 py-2 hover:bg-sheet hover:text-ink transition-colors">
                  Field
                </Link>
                <Link href="/offload" className="rounded-full px-3 py-2 hover:bg-sheet hover:text-ink transition-colors">
                  Capture
                </Link>
                <Link href="/settings" className="rounded-full px-3 py-2 hover:bg-sheet hover:text-ink transition-colors">
                  Settings
                </Link>
                {hasClerk && <UserButton afterSignOutUrl="/" />}
              </nav>
            </header>
          )}
          <main className="flex-1">{children}</main>
        </div>
      </SubscriptionGate>
    </DummyDataProvider>
  );
}
