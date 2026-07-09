"use client";

import { useState } from "react";

interface WaitlistFormProps {
  variant?: "hero" | "pricing" | "inline";
}

export function WaitlistForm({ variant = "inline" }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setMessage("You are on the list. We will be in touch.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  const buttonClass =
    variant === "hero"
      ? "px-6 py-3 rounded-full bg-accent text-white font-ui text-sm font-medium min-h-[48px] hover:opacity-90 disabled:opacity-50"
      : "px-5 py-2.5 rounded-full bg-accent text-white font-ui text-sm font-medium min-h-[48px] hover:opacity-90 disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full max-w-sm">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="flex-1 px-4 py-3 rounded-full border border-border bg-sheet font-ui text-sm text-ink placeholder:text-ink-placeholder focus:outline-none focus:border-accent min-h-[48px]"
          disabled={status === "loading" || status === "success"}
        />
        <button type="submit" disabled={status === "loading" || status === "success"} className={buttonClass}>
          {status === "loading" ? "Joining…" : "Get early access"}
        </button>
      </div>
      {message && (
        <p className={`font-ui text-sm ${status === "error" ? "text-accent" : "text-ink-muted"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
