"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const EXEMPT_PATHS = ["/subscribe", "/onboarding", "/settings", "/offload"];

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setChecked(true);
      return;
    }

    if (EXEMPT_PATHS.some((p) => pathname?.startsWith(p))) {
      setChecked(true);
      return;
    }

    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        const needsCheckout =
          data.freeOffloadUsed &&
          data.freeActivationComplete &&
          !data.trialEndsAt &&
          data.subscriptionStatus === "trialing";

        if (needsCheckout && !pathname?.startsWith("/subscribe")) {
          router.replace("/subscribe");
          return;
        }

        if (
          !data.onboardingComplete &&
          !pathname?.startsWith("/onboarding") &&
          (data.trialEndsAt || !data.freeOffloadUsed)
        ) {
          router.replace("/onboarding");
          return;
        }

        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [pathname, router]);

  if (!checked) return null;
  return <>{children}</>;
}
