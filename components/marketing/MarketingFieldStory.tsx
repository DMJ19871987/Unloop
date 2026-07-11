import { LoopCircle } from "@/components/field/LoopCircle";

const FIELD_LOOPS = [
  { label: "Book the electrician", state: "next_step_known" as const, weight: 3, intensity: 2, seed: 118, className: "left-[18%] top-[18%]" },
  { label: "Talk to Maya", state: "next_step_known" as const, weight: 4, intensity: 3, seed: 227, className: "right-[12%] top-[24%]" },
  { label: "What next at work?", state: "open_attention" as const, weight: 5, intensity: 4, seed: 346, className: "left-[20%] top-[53%]" },
  { label: "Reply to Dad", state: "open_attention" as const, weight: 3, intensity: 2, seed: 451, className: "right-[22%] top-[57%]" },
  { label: "Funding decision", state: "parked" as const, weight: 3, intensity: 2, seed: 564, className: "left-[29%] top-[82%]" },
  { label: "Waiting for the quote", state: "parked" as const, weight: 2, intensity: 1, seed: 673, className: "right-[8%] top-[84%]" },
];

const BANDS = [
  { name: "Ready", detail: "A next step is known" },
  { name: "Clarify", detail: "Still asking for attention" },
  { name: "Waiting", detail: "Parked or outside your control" },
];

export function MarketingFieldStory() {
  return (
    <section className="border-y border-[#3c3530] bg-[#26221f] text-[#f3ece4]">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:px-10 lg:py-24">
        <div className="flex flex-col justify-center">
          <p className="font-ui text-[10px] uppercase tracking-[3px] text-[#b8aa9d]">Meaningful gravity</p>
          <h2 className="mt-5 max-w-lg font-heading text-3xl font-medium leading-tight sm:text-4xl">
            Your thoughts stop competing for the same space.
          </h2>
          <p className="mt-5 max-w-lg font-ui text-base leading-relaxed text-[#c9beb3]">
            Unloop gives every open thread a place. What can move rises. What still needs clarity
            stays visible. What is waiting can rest without being forgotten.
          </p>

          <div className="mt-10 border-y border-[#4a423c]">
            {BANDS.map((band, index) => (
              <div
                key={band.name}
                className={`grid grid-cols-[86px_1fr] gap-4 py-4 ${index > 0 ? "border-t border-[#4a423c]" : ""}`}
              >
                <span className="font-ui text-[11px] uppercase tracking-[2px] text-[#f0e8df]">{band.name}</span>
                <span className="font-ui text-sm text-[#a99c90]">{band.detail}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[560px] overflow-hidden border-y border-[#4a423c] sm:min-h-[620px]">
          <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-[#4a423c]" />
          <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-[#4a423c]" />
          {FIELD_LOOPS.map((loop) => (
            <div key={loop.label} className={`absolute -translate-x-1/2 -translate-y-1/2 ${loop.className}`}>
              <LoopCircle
                label={loop.label}
                state={loop.state}
                weight={loop.weight}
                emotionalIntensity={loop.intensity}
                visualSeed={loop.seed}
                size={loop.weight >= 5 ? 66 : loop.weight >= 4 ? 58 : 48}
                stroke={loop.state === "open_attention" ? "#c96b47" : loop.state === "parked" ? "#766f68" : "#aaa096"}
                labelColor="#e5dbd1"
                labelOpacity={loop.state === "parked" ? 0.58 : 0.88}
                labelMaxWidth={112}
                drift
                showLabel
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
