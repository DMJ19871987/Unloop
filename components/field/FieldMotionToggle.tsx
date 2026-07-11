"use client";

export type FieldMotionMode = "fixed" | "float";

interface FieldMotionToggleProps {
  mode: FieldMotionMode;
  onChange: (mode: FieldMotionMode) => void;
}

export function FieldMotionToggle({ mode, onChange }: FieldMotionToggleProps) {
  return (
    <div
      className="inline-flex min-h-[36px] items-center rounded-full border border-border/70 bg-sheet/62 p-0.5 font-ui text-[10px] text-ink-faint shadow-subtle backdrop-blur sm:text-[11px]"
      role="group"
      aria-label="Loop movement"
    >
      {(["fixed", "float"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={mode === option}
          title={option === "fixed" ? "Keep loops still" : "Let loops drift gently"}
          className={`min-h-[30px] rounded-full px-2.5 capitalize transition sm:px-3 ${
            mode === option
              ? "bg-paper text-accent-selected shadow-sm"
              : "text-ink-faint hover:text-ink-soft"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
