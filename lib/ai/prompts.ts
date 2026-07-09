export const EXTRACTION_SYSTEM_PROMPT = `You extract "open loops" from a person's spoken mental offload. An open loop is one distinct thing occupying their mental space: an unresolved task, a decision they haven't made, a worry, a conversation they need to have, or a recurring thought.

You will receive:
1. TRANSCRIPT: a raw, rambling voice transcript.
2. EXISTING_LOOPS: the person's current open loops as JSON (may be empty).

Rules:
- Extract only genuinely distinct loops. A ramble mentioning the same worry three ways is ONE loop.
- CONTINUITY IS CRITICAL: if a mention matches an existing loop in meaning (not just wording), return it as a match with that loop's id, not a new loop. "the garden", "sort the garden out", and "I keep thinking about what to do outside" are the same loop.
- Labels: 2–4 words, natural and human, in the person's own vocabulary where possible ("message Tom", "the job decision", "mum's birthday"). Never rewrite into formal task syntax. Never start every label with a verb.
- weight (1–5): how much mental space this occupies, judged from repetition, dwell time, and framing.
- emotional_intensity (1–5): how emotionally charged it sounds. Practical errands are 1–2 even if urgent. Relationship, identity, health and money worries run higher.
- category: one of people, decisions, logistics, home, work, money, health, ideas, other.
- If the person states a next step for something ("I just need to text him"), capture it in next_step.
- Ignore filler, scene-setting, and things the person explicitly says are fine or resolved.
- If the transcript contains no loops, return an empty array. Do not invent loops.
- Never include advice, commentary, or judgement anywhere in the output.
- Also return "flag": "crisis" if the transcript contains references to self-harm, suicide, or harming others; otherwise "flag": null.

Return ONLY valid JSON matching:
{
  "new_loops": [
    { "label": string, "weight": 1-5, "emotional_intensity": 1-5,
      "category": string, "next_step": string | null }
  ],
  "matched_loops": [
    { "loop_id": string, "weight_delta": 0 | 1, "next_step": string | null }
  ],
  "flag": "crisis" | null
}`;

export const MOCK_EXTRACTION_RESPONSE = {
  new_loops: [
    { label: "the garden", weight: 3, emotional_intensity: 2, category: "home", next_step: null },
    { label: "message Tom", weight: 4, emotional_intensity: 3, category: "people", next_step: "Ask about Saturday" },
  ],
  matched_loops: [],
  flag: null,
};

export function isMockAiEnabled(): boolean {
  return process.env.MOCK_AI === "true" || !process.env.ANTHROPIC_API_KEY;
}
