"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  track,
  withdrawConsent,
  setConsentState,
  getConsentState,
  type ConsentState,
} from "@/lib/analytics";
import { clearQueue } from "@/lib/offload/queue";

const UserProfile = dynamic(
  () => import("@clerk/nextjs").then((m) => m.UserProfile),
  { ssr: false }
);

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

interface UserSettings {
  email: string;
  checkinHour: number | null;
  weeklyEmailEnabled: boolean;
  keepTranscripts: boolean;
  notificationFrequency: number;
  subscriptionStatus: string;
  subscriptionAccess?: string;
  trialEndsAt?: string | null;
}

export function SettingsScreen() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [deleteStep, setDeleteStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState<ConsentState>("pending");

  useEffect(() => {
    setAnalyticsConsent(getConsentState());
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  async function patch(updates: Record<string, unknown>) {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setSettings((s) => (s ? { ...s, ...data.user } : s));
    }
  }

  async function openBilling() {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setMessage("Billing portal is unavailable without Stripe keys.");
  }

  async function exportData() {
    const res = await fetch("/api/me/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "unloop-export.json";
    a.click();
    URL.revokeObjectURL(url);
    track("data_exported");
  }

  async function deleteAccount() {
    if (deleteStep < 1) {
      setDeleteStep(1);
      return;
    }
    const res = await fetch("/api/me", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    if (res.ok) {
      await clearQueue();
      router.push("/");
    }
    else {
      const data = await res.json().catch(() => ({}));
      setMessage(
        data.error ??
          "Deletion could not be completed. Your account and billing are unchanged."
      );
      setDeleteStep(0);
    }
  }

  function formatBillingDate(iso: string | null | undefined) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const trialEnd = formatBillingDate(settings?.trialEndsAt ?? null);
  const isTrialing = settings?.subscriptionStatus === "trialing";
  const isPastDue = settings?.subscriptionStatus === "past_due";
  const isLapsed =
    settings?.subscriptionAccess === "blocked" ||
    settings?.subscriptionStatus === "canceled";

  if (loading) {
    return (
      <div className="mx-auto max-w-xl space-y-7 px-6 py-10" aria-label="Loading settings">
        <div className="animate-pulse space-y-3">
          <div className="h-2.5 w-24 rounded-full bg-border/70" />
          <div className="h-8 w-36 rounded-md bg-border/70" />
        </div>
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="animate-pulse space-y-4 rounded-[24px] border border-border/70 bg-sheet/50 p-5"
          >
            <div className="h-2.5 w-28 rounded-full bg-border/70" />
            <div className="h-4 w-3/4 rounded-full bg-border-soft" />
            <div className="h-11 w-full rounded-full bg-border-soft/80" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-7 pb-20">
      <div className="animate-float-in">
        <p className="font-ui text-[10px] uppercase tracking-[2.6px] text-ink-placeholder mb-1">
          Control room
        </p>
        <h1 className="font-heading text-[28px] font-medium text-ink">Settings</h1>
      </div>

      {message && (
        <p className="font-ui text-sm text-ink-muted glass-panel rounded-2xl px-4 py-3">
          {message}
        </p>
      )}

      <section className="space-y-3 glass-panel rounded-[24px] p-5">
        <h2 className="font-ui text-xs uppercase tracking-widest text-ink-faint">Account</h2>
        <p className="font-ui text-sm text-ink-soft">{settings?.email}</p>
        {hasClerk && (
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="block font-ui text-sm text-accent-selected hover:text-accent-hover min-h-[48px] rounded-full"
          >
            Manage account
          </button>
        )}
        <button
          type="button"
          onClick={openBilling}
          className="font-ui text-sm text-accent-selected hover:text-accent-hover min-h-[48px] rounded-full"
        >
          Manage subscription
        </button>
        {isTrialing && trialEnd && (
          <p className="font-ui text-xs text-ink-faint">Trial ends {trialEnd}</p>
        )}
        {isPastDue && (
          <p className="font-ui text-xs text-accent">
            There is a problem with your payment. Update your card to keep offloading.
          </p>
        )}
        {isLapsed && (
          <p className="font-ui text-xs text-ink-muted">
            Your subscription has ended. Your loops remain readable — renew to keep offloading.
          </p>
        )}
      </section>

      {showProfile && hasClerk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/80 p-4">
          <div className="relative max-w-md w-full">
            <button
              type="button"
              onClick={() => setShowProfile(false)}
              className="absolute -top-10 right-0 font-ui text-sm text-ink-faint hover:text-ink"
            >
              Close
            </button>
            <UserProfile routing="hash" />
          </div>
        </div>
      )}

      <section className="space-y-3 glass-panel rounded-[24px] p-5">
        <h2 className="font-ui text-xs uppercase tracking-widest text-ink-faint">Field guide</h2>
        <p className="font-ui text-sm leading-relaxed text-ink-muted">
          Read loop marks, gravity bands, movement modes, and the history inside each loop.
        </p>
        <Link
          href="/guide"
          className="inline-flex min-h-[48px] items-center font-ui text-sm text-accent-selected transition hover:text-accent-hover"
        >
          Open the field guide
        </Link>
      </section>

      <section className="space-y-3 glass-panel rounded-[24px] p-5">
        <h2 className="font-ui text-xs uppercase tracking-widest text-ink-faint">Appearance</h2>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`px-4 py-2 rounded-full font-ui text-sm min-h-[48px] border ${
                theme === t
                  ? "border-accent bg-accent-tint text-accent-selected shadow-subtle"
                  : "border-border bg-paper/45 text-ink-soft hover:border-accent/40"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 glass-panel rounded-[24px] p-5">
        <h2 className="font-ui text-xs uppercase tracking-widest text-ink-faint">
          Notifications
        </h2>
        <label className="flex items-center justify-between min-h-[48px]">
          <span className="font-ui text-sm text-ink-soft">Weekly summary email</span>
          <input
            type="checkbox"
            checked={settings?.weeklyEmailEnabled ?? false}
            onChange={(e) => patch({ weeklyEmailEnabled: e.target.checked })}
            className="w-5 h-5 accent-accent"
          />
        </label>
        <div className="flex items-center justify-between min-h-[48px] gap-4">
          <span className="font-ui text-sm text-ink-soft">Evening check-in</span>
          <select
            value={settings?.checkinHour ?? "off"}
            onChange={(e) => {
              const val = e.target.value;
              const hour = val === "off" ? null : parseInt(val, 10);
              patch({ checkinHour: hour });
              if (hour !== null) {
                track("notification_optin", { type: "checkin", hour });
              }
            }}
            className="font-ui text-sm border border-border rounded-full px-3 py-2 bg-paper/55 text-ink-soft min-h-[48px] focus:outline-none focus:border-accent"
          >
            <option value="off">Off</option>
            <option value="18">6pm</option>
            <option value="19">7pm</option>
            <option value="20">8pm</option>
            <option value="21">9pm</option>
            <option value="22">10pm</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            patch({ notificationFrequency: (settings?.notificationFrequency ?? 1) / 2 });
            track("notification_quieter_tapped", { source: "settings" });
          }}
          className="font-ui text-sm text-ink-faint hover:text-ink-soft min-h-[48px]"
        >
          Quieter please
        </button>
      </section>

      <section className="space-y-3 glass-panel rounded-[24px] p-5">
        <h2 className="font-ui text-xs uppercase tracking-widest text-ink-faint">Analytics</h2>
        <p className="font-ui text-sm text-ink-muted leading-relaxed">
          Privacy-safe usage analytics only — no audio, transcripts, or loop content.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setConsentState("accepted");
              setAnalyticsConsent("accepted");
            }}
            className="font-ui text-sm text-accent-selected hover:text-accent-hover min-h-[48px] px-4"
          >
            Accept analytics
          </button>
          <button
            type="button"
            onClick={() => {
              withdrawConsent();
              setAnalyticsConsent("declined");
            }}
            className="font-ui text-sm text-ink-faint hover:text-ink-soft min-h-[48px] px-4"
          >
            Decline / withdraw
          </button>
        </div>
        <p className="font-ui text-xs leading-relaxed text-ink-faint">
          {analyticsConsent === "pending"
            ? "Not chosen. No analytics are sent unless you accept."
            : analyticsConsent === "accepted"
              ? "Analytics enabled. You can withdraw consent at any time."
              : "Analytics disabled. No usage events are sent."}
        </p>
      </section>

      <section className="space-y-3 glass-panel rounded-[24px] p-5">
        <h2 className="font-ui text-xs uppercase tracking-widest text-ink-faint">
          Privacy &amp; data
        </h2>
        <p className="font-ui text-sm text-ink-muted leading-relaxed">
          Audio is sent to OpenAI for transcription and is not saved in Unloop&apos;s database.
          Transcripts are processed by Anthropic to identify loops. Offline recordings may remain
          on this device for up to 24 hours.
        </p>
        <label className="flex items-center justify-between min-h-[48px]">
          <span className="font-ui text-sm text-ink-soft">Don&apos;t keep my transcripts</span>
          <input
            type="checkbox"
            checked={!(settings?.keepTranscripts ?? true)}
            onChange={(e) => patch({ keepTranscripts: !e.target.checked })}
            className="w-5 h-5 accent-accent"
          />
        </label>
        <button
          type="button"
          onClick={exportData}
          className="block font-ui text-sm text-accent-selected hover:text-accent-hover min-h-[48px]"
        >
          Export my data
        </button>
        <button
          type="button"
          onClick={deleteAccount}
          className="block font-ui text-sm text-accent hover:text-accent-hover min-h-[48px]"
        >
          {deleteStep === 0
            ? "Delete everything"
            : "Confirm — this cancels billing and permanently removes all data"}
        </button>
      </section>
    </div>
  );
}
