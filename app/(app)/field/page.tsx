"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { LoopField } from "@/components/field/LoopField";
import { SessionSummary } from "@/components/sheet/SessionSummary";
import { CrisisCard } from "@/components/sheet/CrisisCard";
import { ResurfaceBanner } from "@/components/field/ResurfaceBanner";
import { ResurfaceFlow } from "@/components/field/ResurfaceFlow";
import { ReleasePassBanner } from "@/components/field/ReleasePassBanner";
import { InstallPrompt } from "@/components/app/InstallPrompt";
import { CheckinOnboarding } from "@/components/app/CheckinOnboarding";
import type { LoopDTO } from "@/lib/types/loop";

function releasePassDismissKey() {
  const now = new Date();
  return `unloop-release-pass-${now.getFullYear()}-${now.getMonth()}`;
}

function FieldContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loops, setLoops] = useState<LoopDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryStats, setSummaryStats] = useState<{
    new: number;
    matched: number;
    openAttention: number;
    nextStepKnown: number;
    parked: number;
    total: number;
  } | null>(null);
  const [newLoopIds, setNewLoopIds] = useState<Set<string>>(new Set());
  const [closingLoopId, setClosingLoopId] = useState<string | null>(null);
  const [resurfaceLoops, setResurfaceLoops] = useState<LoopDTO[]>([]);
  const [showResurfaceBanner, setShowResurfaceBanner] = useState(false);
  const [resurfaceActive, setResurfaceActive] = useState(false);
  const [showCrisisCard, setShowCrisisCard] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showCheckinOnboarding, setShowCheckinOnboarding] = useState(false);
  const [showReleasePass, setShowReleasePass] = useState(false);
  const [userMeta, setUserMeta] = useState<{
    sessionsCompleted: number;
    onboardingComplete: boolean;
  } | null>(null);

  const fetchLoops = useCallback(async () => {
    const res = await fetch("/api/loops");
    const data = await res.json();
    setLoops(data.loops ?? []);
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.sessionsCompleted !== undefined) {
          setUserMeta({
            sessionsCompleted: data.sessionsCompleted ?? 0,
            onboardingComplete: data.onboardingComplete ?? false,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLoops().then((data) => {
      const session = searchParams.get("session");
      const newCount = parseInt(searchParams.get("new") ?? "0", 10);
      const matchedCount = parseInt(searchParams.get("matched") ?? "0", 10);
      const crisis = searchParams.get("crisis") === "1";

      if (session && (newCount > 0 || matchedCount > 0)) {
        const newIds = new Set(
          (data.loops as LoopDTO[])
            .slice(0, newCount)
            .map((l: LoopDTO) => l.id)
        );
        setNewLoopIds(newIds);
        setSummaryStats({
          new: newCount,
          matched: matchedCount,
          openAttention: data.loops.filter((l: LoopDTO) => l.state === "open_attention").length,
          nextStepKnown: data.loops.filter((l: LoopDTO) => l.state === "next_step_known").length,
          parked: data.loops.filter((l: LoopDTO) => l.state === "parked").length,
          total: data.loops.length,
        });
        setShowSummary(true);

        if (crisis) setShowCrisisCard(true);
        setShowInstallPrompt(true);

        router.replace("/field", { scroll: false });
      }

      if (searchParams.get("clear") === "1") {
        router.replace("/field", { scroll: false });
      }
    });
  }, [fetchLoops, searchParams, router]);

  useEffect(() => {
    if (!userMeta) return;
    if (userMeta.sessionsCompleted >= 1 && !userMeta.onboardingComplete && showSummary) {
      const t = setTimeout(() => setShowCheckinOnboarding(true), 2500);
      return () => clearTimeout(t);
    }
  }, [userMeta, showSummary]);

  useEffect(() => {
    const openCount = loops.filter(
      (l) => l.state === "open_attention" || l.state === "next_step_known"
    ).length;
    if (openCount >= 25 && !localStorage.getItem(releasePassDismissKey())) {
      setShowReleasePass(true);
    }
  }, [loops]);

  useEffect(() => {
    fetch("/api/resurface")
      .then((r) => r.json())
      .then((data) => {
        if (data.show && data.loops?.length > 0) {
          setResurfaceLoops(data.loops);
          setShowResurfaceBanner(true);
        }
      });
  }, []);

  const dismissResurface = async () => {
    setShowResurfaceBanner(false);
    await fetch("/api/resurface", { method: "POST" });
  };

  const handleLoopUpdate = (updated: LoopDTO) => {
    setLoops((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleLoopRemove = (id: string) => {
    setLoops((prev) => prev.filter((l) => l.id !== id));
    setClosingLoopId(null);
  };

  const handleClosing = (id: string) => {
    setClosingLoopId(id);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="font-ui text-sm text-ink-faint">Loading your field…</p>
      </div>
    );
  }

  return (
    <>
      {showCrisisCard && (
        <CrisisCard onDismiss={() => setShowCrisisCard(false)} />
      )}

      <InstallPrompt
        show={showInstallPrompt}
        onDismiss={() => setShowInstallPrompt(false)}
      />

      {showReleasePass && (
        <ReleasePassBanner
          count={loops.filter((l) => l.state === "open_attention" || l.state === "next_step_known").length}
          onDismiss={() => {
            localStorage.setItem(releasePassDismissKey(), "1");
            setShowReleasePass(false);
          }}
        />
      )}

      {showResurfaceBanner && !resurfaceActive && (
        <ResurfaceBanner
          count={resurfaceLoops.length}
          onTap={() => {
            setResurfaceActive(true);
            setShowResurfaceBanner(false);
          }}
          onDismiss={dismissResurface}
        />
      )}

      <LoopField
        loops={loops}
        onLoopUpdate={handleLoopUpdate}
        onLoopRemove={handleLoopRemove}
        onClosing={handleClosing}
        newLoopIds={newLoopIds}
        closingLoopId={closingLoopId}
      />

      <AnimatePresence>
        {showSummary && summaryStats && (
          <SessionSummary
            stats={summaryStats}
            onDismiss={() => setShowSummary(false)}
          />
        )}
      </AnimatePresence>

      {resurfaceActive && resurfaceLoops.length > 0 && (
        <ResurfaceFlow
          loops={resurfaceLoops}
          onComplete={async () => {
            setResurfaceActive(false);
            await fetch("/api/resurface", { method: "POST" });
            fetchLoops();
          }}
        />
      )}

      {showCheckinOnboarding && (
        <CheckinOnboarding
          onYes={async () => {
            await fetch("/api/me", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ onboardingComplete: true, checkinHour: 20 }),
            });
            setShowCheckinOnboarding(false);
            setUserMeta((m) => (m ? { ...m, onboardingComplete: true } : m));
          }}
          onNo={async () => {
            await fetch("/api/me", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ onboardingComplete: true }),
            });
            setShowCheckinOnboarding(false);
            setUserMeta((m) => (m ? { ...m, onboardingComplete: true } : m));
          }}
        />
      )}
    </>
  );
}

export default function FieldPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <p className="font-ui text-sm text-ink-faint">Loading…</p>
        </div>
      }
    >
      <FieldContent />
    </Suspense>
  );
}
