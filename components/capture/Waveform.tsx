"use client";

const BAR_COUNT = 11;

interface WaveformProps {
  levels: number[];
  active?: boolean;
}

export function Waveform({ levels, active = false }: WaveformProps) {
  const displayLevels =
    levels.length === BAR_COUNT
      ? levels
      : Array.from({ length: BAR_COUNT }, () => 0.25);

  return (
    <div className="flex items-end gap-[5px] h-9">
      {displayLevels.map((level, i) => (
        <div
          key={i}
          className="w-1 rounded-full origin-bottom transition-transform duration-100"
          style={{
            height: "100%",
            transform: `scaleY(${active ? level : 0.35})`,
            background:
              active && level > 0.6
                ? "var(--accent)"
                : active
                  ? "#D8B7A5"
                  : "#E0C7B7",
          }}
        />
      ))}
    </div>
  );
}
