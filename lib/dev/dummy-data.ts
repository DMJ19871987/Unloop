import { computeLoopLayout, partitionFieldLoops } from "@/lib/loops/layout";
import { visualSeedFromLabel } from "@/lib/loops/state";
import type { LoopDTO, ClosureAction, LoopCategory } from "@/lib/types/loop";
import type { LoopState } from "@/lib/loops/state";

const DEMO_USER = "dummy-dev-user";

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function loop(
  id: string,
  label: string,
  state: LoopState,
  opts: {
    category?: LoopCategory;
    weight?: number;
    emotionalIntensity?: number;
    nextStep?: string | null;
    mentionCount?: number;
    resurfaceAfter?: string | null;
    closedAt?: string | null;
    createdDaysAgo?: number;
    updatedDaysAgo?: number;
  } = {}
): LoopDTO {
  const created = opts.createdDaysAgo ?? 14;
  const updated = opts.updatedDaysAgo ?? 1;
  return {
    id,
    label,
    state,
    category: opts.category ?? "other",
    weight: opts.weight ?? 3,
    emotionalIntensity: opts.emotionalIntensity ?? 2,
    nextStep: opts.nextStep ?? null,
    mentionCount: opts.mentionCount ?? 1,
    visualSeed: visualSeedFromLabel(label, DEMO_USER),
    resurfaceAfter: opts.resurfaceAfter ?? null,
    closedAt: opts.closedAt ?? null,
    createdAt: daysAgo(created),
    updatedAt: daysAgo(updated),
  };
}

const RAW_FIELD_LOOPS: LoopDTO[] = [
  loop("d-01", "Job application", "open_attention", { category: "work", weight: 5, emotionalIntensity: 5, mentionCount: 4 }),
  loop("d-02", "Mum's birthday", "open_attention", { category: "people", weight: 4, emotionalIntensity: 4, mentionCount: 3 }),
  loop("d-03", "The garden", "open_attention", { category: "home", weight: 3, emotionalIntensity: 2, mentionCount: 2 }),
  loop("d-04", "School run tomorrow", "open_attention", { category: "logistics", weight: 4, emotionalIntensity: 3 }),
  loop("d-05", "That conversation", "open_attention", { category: "people", weight: 5, emotionalIntensity: 4, mentionCount: 5 }),
  loop("d-06", "Tax return", "open_attention", { category: "money", weight: 3, emotionalIntensity: 2 }),
  loop("d-07", "New project idea", "open_attention", { category: "ideas", weight: 2, emotionalIntensity: 3 }),
  loop("d-08", "Dentist follow-up", "open_attention", { category: "health", weight: 2, emotionalIntensity: 1 }),
  loop("d-09", "Message Tom", "next_step_known", { category: "people", weight: 4, emotionalIntensity: 3, nextStep: "Ask about Saturday" }),
  loop("d-10", "Call the bank", "next_step_known", { category: "money", weight: 3, emotionalIntensity: 2, nextStep: "Query the charge on Tuesday" }),
  loop("d-11", "Buy birthday gift", "next_step_known", { category: "logistics", weight: 3, emotionalIntensity: 2, nextStep: "Order online tonight" }),
  loop("d-12", "Email Sarah", "next_step_known", { category: "work", weight: 2, emotionalIntensity: 1, nextStep: "Send the draft by noon" }),
  loop("d-13", "Weekend plans", "next_step_known", { category: "decisions", weight: 3, emotionalIntensity: 2, nextStep: "Check cinema times" }),
  loop("d-14", "Reply to Sam", "parked", { category: "people", weight: 2, emotionalIntensity: 1, updatedDaysAgo: 25, resurfaceAfter: daysAgo(4) }),
  loop("d-15", "Book flights", "parked", { category: "logistics", weight: 3, emotionalIntensity: 2, updatedDaysAgo: 22, resurfaceAfter: daysAgo(1) }),
  loop("d-16", "Sort the loft", "parked", { category: "home", weight: 2, emotionalIntensity: 1, updatedDaysAgo: 30 }),
  loop("d-17", "Old side project", "parked", { category: "ideas", weight: 1, emotionalIntensity: 1, updatedDaysAgo: 45 }),
  loop("d-18", "Insurance renewal", "parked", { category: "money", weight: 2, emotionalIntensity: 1, updatedDaysAgo: 18 }),
  loop("d-19", "Kitchen drawer", "parked", { category: "home", weight: 1, emotionalIntensity: 1, updatedDaysAgo: 40 }),
  loop("d-20", "Team offsite", "parked", { category: "work", weight: 2, emotionalIntensity: 2, updatedDaysAgo: 28, resurfaceAfter: daysAgo(2) }),
  loop("d-21", "Holiday photos", "parked", { category: "other", weight: 1, emotionalIntensity: 1, updatedDaysAgo: 60 }),
  loop("d-22", "Car MOT", "open_attention", { category: "logistics", weight: 3, emotionalIntensity: 2 }),
  loop("d-23", "Presentation nerves", "open_attention", { category: "work", weight: 4, emotionalIntensity: 4 }),
  loop("d-24", "What to cook", "open_attention", { category: "home", weight: 1, emotionalIntensity: 1 }),
  loop("d-25", "Friend's wedding", "open_attention", { category: "people", weight: 3, emotionalIntensity: 3 }),
  loop("d-26", "Savings goal", "next_step_known", { category: "money", weight: 2, emotionalIntensity: 2, nextStep: "Move £200 on payday" }),
  loop("d-27", "Bins out", "open_attention", { category: "home", weight: 1, emotionalIntensity: 1 }),
  loop("d-28", "Client feedback", "open_attention", { category: "work", weight: 3, emotionalIntensity: 3 }),
  loop("d-29", "Pick up prescription", "open_attention", { category: "health", weight: 2, emotionalIntensity: 1 }),
  loop("d-30", "Reply to group chat", "open_attention", { category: "people", weight: 2, emotionalIntensity: 2 }),
  loop("d-31", "Choose paint colour", "open_attention", { category: "decisions", weight: 2, emotionalIntensity: 2 }),
  loop("d-32", "Fix bike tyre", "open_attention", { category: "logistics", weight: 2, emotionalIntensity: 1 }),
  loop("d-33", "Morning routine", "open_attention", { category: "other", weight: 1, emotionalIntensity: 1 }),
];

function withLayout(loops: LoopDTO[]): LoopDTO[] {
  const { visible } = partitionFieldLoops(
    loops.map((l) => ({
      id: l.id,
      state: l.state,
      weight: l.weight,
      emotionalIntensity: l.emotionalIntensity,
      label: l.label,
      visualSeed: l.visualSeed,
    })),
    true
  );
  const visibleIds = new Set(visible.map((v) => v.id));
  const toLayout = loops.filter((l) => visibleIds.has(l.id));

  const positions = computeLoopLayout(
    toLayout.map((l) => ({
      id: l.id,
      state: l.state,
      weight: l.weight,
      emotionalIntensity: l.emotionalIntensity,
      label: l.label,
      visualSeed: l.visualSeed,
    })),
    390,
    520,
    { visibleCount: toLayout.length }
  );
  const posMap = new Map(positions.map((p) => [p.id, p]));
  return loops.map((l) => ({
    ...l,
    x: posMap.get(l.id)?.x,
    y: posMap.get(l.id)?.y,
  }));
}

export function getDummyFieldLoops(): LoopDTO[] {
  return withLayout(RAW_FIELD_LOOPS);
}

export function getDummyResurfaceLoops(): LoopDTO[] {
  return RAW_FIELD_LOOPS.filter(
    (l) => l.state === "parked" && l.resurfaceAfter && new Date(l.resurfaceAfter) <= new Date()
  ).slice(0, 3);
}

export function getDummyClosedLoops(): (LoopDTO & { size?: number })[] {
  const closed = [
    loop("d-c1", "Fix the shelf", "done", { category: "home", weight: 2, closedAt: daysAgo(5), updatedDaysAgo: 5 }),
    loop("d-c2", "Dentist", "released", { category: "health", weight: 2, closedAt: daysAgo(12), updatedDaysAgo: 12 }),
    loop("d-c3", "Old argument", "released", { category: "people", weight: 2, emotionalIntensity: 3, closedAt: daysAgo(18), updatedDaysAgo: 18 }),
    loop("d-c4", "Pay credit card", "done", { category: "money", weight: 2, closedAt: daysAgo(8), updatedDaysAgo: 8 }),
    loop("d-c5", "School forms", "done", { category: "logistics", weight: 2, closedAt: daysAgo(3), updatedDaysAgo: 3 }),
    loop("d-c6", "Apologise to James", "released", { category: "people", weight: 3, emotionalIntensity: 3, closedAt: daysAgo(25), updatedDaysAgo: 25 }),
    loop("d-c7", "Cancel subscription", "done", { category: "money", weight: 1, closedAt: daysAgo(14), updatedDaysAgo: 14 }),
    loop("d-c8", "Clear inbox", "released", { category: "work", weight: 2, closedAt: daysAgo(7), updatedDaysAgo: 7 }),
    loop("d-c9", "Plant bulbs", "done", { category: "home", weight: 1, closedAt: daysAgo(21), updatedDaysAgo: 21 }),
    loop("d-c10", "Let go of guilt", "released", { category: "other", weight: 3, emotionalIntensity: 4, closedAt: daysAgo(35), updatedDaysAgo: 35 }),
  ];
  return closed.map((l, i) => ({
    ...l,
    size: Math.max(48, 112 - i * 6),
  }));
}

export function getDummyWeeklySummaries() {
  return [
    {
      id: "d-w1",
      weekStart: daysAgo(7),
      summaryText:
        "Work loops dominated this week, but you released more than you opened. Decisions are what linger longest for you.",
      stats: { opened: 4, released: 3, done: 2, parked: 2, dominantCategory: "work" },
      createdAt: daysAgo(6),
    },
    {
      id: "d-w2",
      weekStart: daysAgo(14),
      summaryText: "A quieter week for logistics. Most loops left with a next step.",
      stats: { opened: 3, released: 2, done: 1, parked: 1, dominantCategory: "logistics" },
      createdAt: daysAgo(13),
    },
    {
      id: "d-w3",
      weekStart: daysAgo(21),
      summaryText:
        "People loops surfaced often. The job decision has now outlasted everything opened alongside it.",
      stats: { opened: 5, released: 1, done: 0, parked: 3, dominantCategory: "people" },
      createdAt: daysAgo(20),
    },
    {
      id: "d-w4",
      weekStart: daysAgo(28),
      summaryText: "You parked more than usual — a sign the week was full. Home loops kept returning.",
      stats: { opened: 2, released: 2, done: 1, parked: 4, dominantCategory: "home" },
      createdAt: daysAgo(27),
    },
  ];
}

export function getDummyRecordCounter(): string {
  return "10 loops released since March";
}

const ACTION_STATE: Record<ClosureAction, LoopState | "weight_bump"> = {
  done: "done",
  next_step_known: "next_step_known",
  parked: "parked",
  released: "released",
  still_on_mind: "weight_bump",
};

export function applyDummyLoopAction(
  loopItem: LoopDTO,
  action: ClosureAction,
  extras?: { nextStep?: string }
): LoopDTO {
  const target = ACTION_STATE[action];

  if (target === "weight_bump") {
    return {
      ...loopItem,
      weight: Math.min(5, loopItem.weight + 1),
      updatedAt: new Date().toISOString(),
    };
  }

  const now = new Date().toISOString();
  const isClosing = target === "done" || target === "released";

  return {
    ...loopItem,
    state: target,
    nextStep: extras?.nextStep ?? loopItem.nextStep,
    resurfaceAfter: target === "parked" ? daysAgo(-21) : loopItem.resurfaceAfter,
    closedAt: isClosing ? now : loopItem.closedAt,
    updatedAt: now,
  };
}

export const DUMMY_DATA_STORAGE_KEY = "unloop-dummy-data";

export function isDummyDataAvailable(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEV_DUMMY_DATA === "true"
  );
}
