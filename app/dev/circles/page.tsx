import { LoopCircle } from "@/components/field/LoopCircle";
import { visualSeedFromLabel } from "@/lib/loops/state";

const SAMPLES = [
  { label: "Job application", state: "open_attention" as const, weight: 5, ei: 5 },
  { label: "Mum's birthday", state: "open_attention" as const, weight: 4, ei: 4 },
  { label: "The garden", state: "open_attention" as const, weight: 3, ei: 2 },
  { label: "Message Tom", state: "next_step_known" as const, weight: 4, ei: 3 },
  { label: "Call the bank", state: "next_step_known" as const, weight: 3, ei: 2 },
  { label: "Reply to Sam", state: "parked" as const, weight: 2, ei: 1 },
  { label: "Sort the loft", state: "parked" as const, weight: 2, ei: 1 },
  { label: "Tax return", state: "open_attention" as const, weight: 3, ei: 2 },
  { label: "Weekend plans", state: "next_step_known" as const, weight: 3, ei: 2 },
  { label: "Bins out", state: "open_attention" as const, weight: 1, ei: 1 },
  { label: "Old side project", state: "parked" as const, weight: 1, ei: 1 },
  { label: "Presentation nerves", state: "open_attention" as const, weight: 4, ei: 4 },
].map((s, i) => ({
  ...s,
  seed: visualSeedFromLabel(s.label, `dev-circles-${i}`),
}));

export default function DevCirclesPage() {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.NEXT_PUBLIC_DEV_DUMMY_DATA !== "true"
  ) {
    return (
      <main className="min-h-screen bg-paper p-8 font-ui text-ink">
        Dev circles preview is unavailable in this environment.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper p-8">
      <h1 className="font-heading text-2xl text-ink mb-2">Loop arc geometry</h1>
      <p className="font-ui text-sm text-ink-faint mb-8">
        12 seeded loops at 32px and 120px — each must read as one hand-drawn incomplete circle.
      </p>

      <section className="mb-12">
        <h2 className="font-ui text-xs uppercase tracking-wide text-ink-faint mb-4">32px diameter</h2>
        <div className="flex flex-wrap gap-6 items-end">
          {SAMPLES.map((s) => (
            <LoopCircle
              key={`sm-${s.label}`}
              label={s.label}
              state={s.state}
              weight={s.weight}
              emotionalIntensity={s.ei}
              visualSeed={s.seed}
              size={32}
              forField
              visibleCount={12}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-ui text-xs uppercase tracking-wide text-ink-faint mb-4">120px diameter</h2>
        <div className="flex flex-wrap gap-10 items-end">
          {SAMPLES.map((s) => (
            <LoopCircle
              key={`lg-${s.label}`}
              label={s.label}
              state={s.state}
              weight={s.weight}
              emotionalIntensity={s.ei}
              visualSeed={s.seed}
              size={120}
              forField
              visibleCount={12}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
