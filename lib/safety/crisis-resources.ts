export interface CrisisLine {
  name: string;
  contact: string;
  note: string;
}

export interface CrisisResources {
  region: string;
  lines: CrisisLine[];
}

export const CRISIS_ACK_COPY =
  "Some of what you said sounds heavy. Unloop is a place to set thoughts down, not a source of support — if things feel like too much, talking to someone you trust or a professional can genuinely help. In the UK you can call or text Samaritans on 116 123, any time.";

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

/** Days to retain crisis-flagged transcripts before purge (see /api/cron/purge-crisis-transcripts). */
export function crisisTranscriptRetentionDays(): number {
  const raw = process.env.CRISIS_TRANSCRIPT_RETENTION_DAYS;
  const parsed = raw ? parseInt(raw, 10) : 30;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}
