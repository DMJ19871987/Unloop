// Deliberately high-recall / low-precision. False positives are acceptable here —
// showing support to someone who didn't need it is a far cheaper error than
// walling someone who did. Keep the term list in this file, easy to extend.

const CRISIS_PHRASES = [
  "kill myself",
  "killing myself",
  "end my life",
  "ending my life",
  "want to die",
  "wanna die",
  "wish i was dead",
  "wish i were dead",
  "hurt myself",
  "hurting myself",
  "harm myself",
  "harming myself",
  "self harm",
  "self-harm",
  "selfharm",
  "suicide",
  "suicidal",
  "take my life",
  "taking my life",
  "cut myself",
  "cutting myself",
  "overdose",
  "overdosing",
  "don't want to be here",
  "dont want to be here",
  "don't want to live",
  "dont want to live",
  "no reason to live",
  "better off dead",
  "end it all",
  "ending it all",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function crisisPrescreen(transcript: string): boolean {
  const norm = normalize(transcript);
  if (!norm) return false;
  return CRISIS_PHRASES.some((phrase) => norm.includes(phrase));
}
