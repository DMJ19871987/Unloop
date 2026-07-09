"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { DummyDataProvider } from "@/components/providers/DummyDataProvider";
import { DummyDataToggle } from "@/components/app/DummyDataToggle";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <DummyDataProvider>
      <div className="min-h-screen bg-paper flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border gap-4">
          <Link href="/field" className="font-heading text-lg text-ink shrink-0">
            Unloop
          </Link>
          <nav className="flex items-center gap-4 font-ui text-sm text-ink-faint flex-wrap justify-end">
            <DummyDataToggle />
            <Link href="/field" className="hover:text-ink transition-colors">
              Field
            </Link>
            <Link href="/offload" className="hover:text-ink transition-colors">
              Capture
            </Link>
            <Link href="/settings" className="hover:text-ink transition-colors">
              Settings
            </Link>
            {hasClerk && <UserButton afterSignOutUrl="/" />}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </DummyDataProvider>
  );
}
