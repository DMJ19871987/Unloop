export interface CrisisLine {
  name: string;
  contact: string;
  note: string;
}

export interface CrisisResources {
  region: string;
  lines: CrisisLine[];
}

// TODO: final copy pending review — do not invent therapeutic or reassuring language.
export const CRISIS_ACK_COPY =
  "If you would like to talk to someone, these support lines are available.";

export const CRISIS_RESOURCES: CrisisResources = {
  region: "UK",
  lines: [
    { name: "Samaritans", contact: "Call 116 123", note: "free, 24/7" },
    { name: "SHOUT", contact: "Text SHOUT to 85258", note: "free, 24/7 text support" },
    {
      name: "Emergency",
      contact: "Call 999",
      note: "if you or someone else is in immediate danger",
    },
  ],
};

/** Days to retain crisis-flagged transcripts before purge. Tier 3 — wire to cron. */
export function crisisTranscriptRetentionDays(): number {
  const raw = process.env.CRISIS_TRANSCRIPT_RETENTION_DAYS;
  const parsed = raw ? parseInt(raw, 10) : 30;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}
