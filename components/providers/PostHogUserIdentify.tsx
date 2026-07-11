"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { identifyUser } from "@/lib/analytics";

export function PostHogUserIdentify() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;
    identifyUser(user.id);
  }, [isLoaded, user]);

  return null;
}
