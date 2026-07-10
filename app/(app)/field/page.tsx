"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { LoopField } from "@/components/field/LoopField";
import { SessionSummary } from "@/components/sheet/SessionSummary";
import { ClearHeadInterstitial } from "@/components/sheet/ClearHeadInterstitial";
import { CrisisSupport } from "@/components/safety/CrisisSupport";
import { ResurfaceBanner } from "@/components/field/ResurfaceBanner";
import { ResurfaceFlow } from "@/components/field/ResurfaceFlow";
import { ReleasePassBanner } from "@/components/field/ReleasePassBanner";
import { InstallPrompt } from "@/components/app/InstallPrompt";
import { CheckinOnboarding } from "@/components/app/CheckinOnboarding";
import { useDummyData } from "@/components/providers/DummyDataProvider";
import { platform } from "@/lib/platform";
import { track } from "@/lib/analytics";
import {
  getDummyFieldLoops,
  getDummyResurfaceLoops,
} from "@/lib/dev/dummy-data";
import {
  loadPendingProposals,
  migrateSessionProposals,
  removePendingProposal,
} from "@/lib/offload/proposal-storage";

import type { LoopDTO } from "@/lib/types/loop";
import type { ExtractionProposal } from "@/lib/ai/extraction-types";
import { ProposalCards } from "@/components/field/ProposalCards";

const LOOPS_CACHE_KEY = "loops-cache";
const INSTALL_DISMISS_KEY = "install-prompt-dismissed";

function releasePassDismissKey() {
  const now = new Date();
  return `unloop-release-pass-${now.getFullYear()}-${now.getMonth()}`;
}

function parseNewLoopIds(param: string | null): Set<string> {
  if (!param) return new Set();
  // Comma-separated UUIDs from extract redirect
  if (param.includes("-") || param.includes(",")) {
    return new Set(param.split(",").map((s) => s.trim()).filter(Boolean));
  }
  return new Set();
}

function FieldContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { enabled: dummyData } = useDummyData();
  const crisisSupport = searchParams.get("crisis") === "support";
  const [loops, setLoops] = useState<LoopDTO[]>([]);
  const [loading, setLoading] = useState(!crisisSupport);
  const [offline, setOffline] = useState(false);
  const [showOfflineQueue, setShowOfflineQueue] = useState(false);
  const [showClearHead, setShowClearHead] = useState(false);
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
  const [closingAction, setClosingAction] = useState<"done" | "released" | null>(null);
  const [resurfaceLoops, setResurfaceLoops] = useState<LoopDTO[]>([]);
  const [showResurfaceBanner, setShowResurfaceBanner] = useState(false);
  const [resurfaceActive, setResurfaceActive] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showCheckinOnboarding, setShowCheckinOnboarding] = useState(false);
  const [showReleasePass, setShowReleasePass] = useState(false);
  const [proposals, setProposals] = useState<ExtractionProposal[]>([]);
  const [userMeta, setUserMeta] = useState<{
    sessionsCompleted: number;
    onboardingComplete: boolean;
  } | null>(null);

  const loadFromCache = useCallback(async () => {
    const cached = await platform.getLocal<{ loops: LoopDTO[] }>(LOOPS_CACHE_KEY);
    if (cached?.loops?.length) {
      setLoops(cached.loops);
      return cached.loops;
    }
    return [];
  }, []);

  const fetchLoops = useCallback(async () => {
    if (!platform.isOnline()) {
      await loadFromCache();
      setOffline(true);
      setLoading(false);
      return { loops: [] };
    }

    try {
      const res = await fetch("/api/loops");
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      const fetched = data.loops ?? [];
      setLoops(fetched);
      await platform.storeLocal(LOOPS_CACHE_KEY, { loops: fetched, cachedAt: Date.now() });
      setOffline(false);
      setLoading(false);
      return data;
    } catch {
      await loadFromCache();
      setOffline(true);
      setLoading(false);
      return { loops: [] };
    }
  }, [loadFromCache]);

  useEffect(() => {
    if (crisisSupport) return;

    if (dummyData) {
      const dummyLoops = getDummyFieldLoops();
      const dummyResurface = getDummyResurfaceLoops();
      setLoops(dummyLoops);
      setResurfaceLoops(dummyResurface);
      setShowResurfaceBanner(dummyResurface.length > 0);
      setShowInstallPrompt(false);
      setShowCheckinOnboarding(false);
      setShowSummary(false);
      setLoading(false);

      const openCount = dummyLoops.filter(
        (l) => l.state === "open_attention" || l.state === "next_step_known"
      ).length;
      if (openCount >= 25 && !localStorage.getItem(releasePassDismissKey())) {
        setShowReleasePass(true);
      } else {
        setShowReleasePass(false);
      }
      return;
    }

    const session = searchParams.get("session");
    if (session) {
      migrateSessionProposals(session);
    }
    setProposals(loadPendingProposals());

    if (searchParams.get("offline") === "1") {
      setShowOfflineQueue(true);
    }

    if (searchParams.get("clear") === "1") {
      setShowClearHead(true);
    }

    setLoading(true);
    fetchLoops().then((data) => {
      const newParam = searchParams.get("new");
      const matchedCount = parseInt(searchParams.get("matched") ?? "0", 10);
      const parsedNewIds = parseNewLoopIds(newParam);
      const newCount = parsedNewIds.size > 0
        ? parsedNewIds.size
        : parseInt(newParam ?? "0", 10);

      if (session && (newCount > 0 || matchedCount > 0)) {
        const newIds =
          parsedNewIds.size > 0
            ? parsedNewIds
            : new Set(
                (data.loops as LoopDTO[])
                  .slice(0, newCount)
                  .map((l: LoopDTO) => l.id)
              );
        setNewLoopIds(newIds);
        setSummaryStats({
          new: newCount,
          matched: matchedCount,
          openAttention: (data.loops ?? []).filter((l: LoopDTO) => l.state === "open_attention").length,
          nextStepKnown: (data.loops ?? []).filter((l: LoopDTO) => l.state === "next_step_known").length,
          parked: (data.loops ?? []).filter((l: LoopDTO) => l.state === "parked").length,
          total: (data.loops ?? []).length,
        });
        setShowSummary(true);
        platform.getLocal<boolean>(INSTALL_DISMISS_KEY).then((dismissed) => {
          if (!dismissed) setShowInstallPrompt(true);
        });
      }

      const replaceParams = new URLSearchParams();
      if (searchParams.get("offline") === "1") replaceParams.set("offline", "1");
      const replacePath = replaceParams.toString()
        ? `/field?${replaceParams.toString()}`
        : "/field";
      if (session || searchParams.get("clear") === "1") {
        router.replace(replacePath, { scroll: false });
      }
    });
  }, [dummyData, fetchLoops, searchParams, router, crisisSupport]);

  useEffect(() => {
    if (dummyData || crisisSupport) return;
    return platform.onOnline(() => {
      setOffline(false);
      setShowOfflineQueue(false);
      fetchLoops();
    });
  }, [dummyData, crisisSupport, fetchLoops]);

  useEffect(() => {
    if (dummyData || crisisSupport) return;
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
  }, [dummyData, crisisSupport]);

  useEffect(() => {
    if (dummyData || crisisSupport || !userMeta) return;
    if (userMeta.sessionsCompleted >= 1 && !userMeta.onboardingComplete && showSummary) {
      const t = setTimeout(() => setShowCheckinOnboarding(true), 2500);
      return () => clearTimeout(t);
    }
  }, [userMeta, showSummary, dummyData, crisisSupport]);

  useEffect(() => {
    if (dummyData || crisisSupport) return;
    const openCount = loops.filter(
      (l) => l.state === "open_attention" || l.state === "next_step_known"
    ).length;
    if (openCount >= 25 && !localStorage.getItem(releasePassDismissKey())) {
      setShowReleasePass(true);
    }
  }, [loops, dummyData, crisisSupport]);

  useEffect(() => {
    if (dummyData || crisisSupport) return;
    fetch("/api/resurface")
      .then((r) => r.json())
      .then((data) => {
        if (data.show && data.loops?.length > 0) {
          setResurfaceLoops(data.loops);
          setShowResurfaceBanner(true);
          track("parked_resurfaced", { count: data.loops.length });
        }
      });
  }, [dummyData, crisisSupport]);

  const dismissResurface = async () => {
    setShowResurfaceBanner(false);
    if (!dummyData) await fetch("/api/resurface", { method: "POST" });
  };

  const handleLoopUpdate = (updated: LoopDTO) => {
    setLoops((prev) => {
      const next = prev.map((l) => (l.id === updated.id ? updated : l));
      platform.storeLocal(LOOPS_CACHE_KEY, { loops: next, cachedAt: Date.now() });
      return next;
    });
  };

  const handleLoopRemove = (id: string) => {
    setLoops((prev) => {
      const next = prev.filter((l) => l.id !== id);
      platform.storeLocal(LOOPS_CACHE_KEY, { loops: next, cachedAt: Date.now() });
      return next;
    });
    setClosingLoopId(null);
    setClosingAction(null);
  };

  const handleClosing = (id: string, action: "done" | "released") => {
    setClosingLoopId(id);
    setClosingAction(action);
  };

  const handleProposalConfirm = async (proposal: ExtractionProposal) => {
    const res = await fetch("/api/loops/apply-proposal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmed: true,
        loop_id: proposal.loop_id,
        change: proposal.change,
        evidence: proposal.evidence,
      }),
    });
    const data = await res.json();
    if (!res.ok) return;

    if (data.removedId) {
      setLoops((prev) =>
        prev
          .filter((l) => l.id !== data.removedId)
          .map((l) => (l.id === data.loop?.id ? data.loop : l))
      );
    } else if (data.loop) {
      handleLoopUpdate(data.loop);
      if (data.loop.state === "done" || data.loop.state === "released") {
        setLoops((prev) => prev.filter((l) => l.id !== data.loop.id));
      }
    }
    removePendingProposal(proposal.id);
    setProposals(loadPendingProposals());
  };

  const handleProposalDismiss = (proposalId: string) => {
    removePendingProposal(proposalId);
    setProposals(loadPendingProposals());
  };

  if (crisisSupport) {
    return (
      <CrisisSupport
        onContinue={() => {
          setLoading(true);
          router.replace("/field");
          fetchLoops();
        }}
      />
    );
  }

  if (loading) {
    return (
      <>
        <div className="min-h-[70vh] flex items-center justify-center">
          <p className="font-ui text-sm text-ink-faint">Loading your field…</p>
        </div>
        <AnimatePresence>
          {showClearHead && (
            <ClearHeadInterstitial onDismiss={() => setShowClearHead(false)} />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      {(offline || showOfflineQueue) && (
        <p className="px-7 pt-2 font-ui text-xs text-ink-soft text-center">
          {showOfflineQueue
            ? "Held safely — it'll process when you're back online."
            : "Offline — showing your last field."}
        </p>
      )}

      <InstallPrompt
        show={showInstallPrompt}
        onDismiss={async () => {
          await platform.storeLocal(INSTALL_DISMISS_KEY, true);
          setShowInstallPrompt(false);
        }}
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
        closingAction={closingAction}
        dummyMode={dummyData}
      />

      <ProposalCards
        proposals={proposals}
        loops={loops}
        onConfirm={handleProposalConfirm}
        onDismiss={handleProposalDismiss}
      />

      <AnimatePresence>
        {showSummary && summaryStats && (
          <SessionSummary
            stats={summaryStats}
            onDismiss={() => setShowSummary(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClearHead && (
          <ClearHeadInterstitial onDismiss={() => setShowClearHead(false)} />
        )}
      </AnimatePresence>

      {resurfaceActive && resurfaceLoops.length > 0 && (
        <ResurfaceFlow
          loops={resurfaceLoops}
          dummyMode={dummyData}
          onComplete={async () => {
            setResurfaceActive(false);
            if (!dummyData) await fetch("/api/resurface", { method: "POST" });
            if (!dummyData) fetchLoops();
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
