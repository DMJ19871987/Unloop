"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initAnalytics, trackPageview } from "@/lib/analytics";

const MARKETING_PATHS = ["/", "/pricing", "/privacy", "/terms"];

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (MARKETING_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      trackPageview(pathname);
    }
  }, [pathname]);

  return <>{children}</>;
}
