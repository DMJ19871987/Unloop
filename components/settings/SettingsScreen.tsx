"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/providers/ThemeProvider";
import { track } from "@/lib/analytics";

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
}

export function SettingsScreen() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [deleteStep, setDeleteStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
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
    if (res.ok) router.push("/");
    else setMessage("Deletion failed. Please try again.");
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="font-ui text-sm text-ink-faint">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10 space-y-8 pb-20">
      <h1 className="font-heading text-2xl font-medium text-ink">Settings</h1>

      {message && (
        <p className="font-ui text-sm text-ink-muted bg-sheet border border-border rounded-xl px-4 py-3">
          {message}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-ui text-xs uppercase tracking-widest text-ink-faint">Account</h2>
        <p className="font-ui text-sm text-ink-soft">{settings?.email}</p>
        {hasClerk && (
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="block font-ui text-sm text-accent-selected hover:text-accent-hover min-h-[48px]"
          >
            Manage account
          </button>
        )}
        <button
          type="button"
          onClick={openBilling}
          className="font-ui text-sm text-accent-selected hover:text-accent-hover min-h-[48px]"
        >
          Manage subscription ({settings?.subscriptionStatus})
        </button>
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

      <section className="space-y-3">
        <h2 className="font-ui text-xs uppercase tracking-widest text-ink-faint">Appearance</h2>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`px-4 py-2 rounded-full font-ui text-sm min-h-[48px] border ${
                theme === t
                  ? "border-accent bg-accent-tint text-accent-selected"
                  : "border-border text-ink-soft"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
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
            className="font-ui text-sm border border-border rounded-full px-3 py-2 bg-sheet text-ink-soft min-h-[48px]"
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

      <section className="space-y-3">
        <h2 className="font-ui text-xs uppercase tracking-widest text-ink-faint">
          Privacy &amp; data
        </h2>
        <p className="font-ui text-sm text-ink-muted leading-relaxed">
          Spoken, structured, deleted. Your audio is transcribed and immediately discarded.
          Your thoughts are never used to train AI.
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
          {deleteStep === 0 ? "Delete everything" : "Confirm — delete all data permanently"}
        </button>
      </section>
    </div>
  );
}
