import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Unloop — Empty your head";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ARCS = [
  { cx: 380, cy: 320, r: 72, seed: 11, arc: 0.82 },
  { cx: 520, cy: 280, r: 58, seed: 29, arc: 0.76 },
  { cx: 640, cy: 360, r: 64, seed: 47, arc: 0.88 },
  { cx: 760, cy: 300, r: 52, seed: 63, arc: 0.71 },
  { cx: 860, cy: 340, r: 48, seed: 81, arc: 0.85 },
];

function arcPath(cx: number, cy: number, r: number, completeness: number, seed: number) {
  const sweep = completeness * Math.PI * 2;
  const start = -Math.PI / 2 + (seed % 97) * 0.0025;
  const points: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const angle = start + t * sweep;
    const jitter = Math.sin(seed + t * 4.2) * 0.025 * r;
    const rr = r + jitter;
    const x = cx + Math.cos(angle) * rr;
    const y = cy + Math.sin(angle) * rr;
    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return points.join(" ");
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#FAF7F2",
          padding: "64px 72px",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 480 }}>
            <span
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 64,
                fontWeight: 600,
                color: "#2B2724",
                lineHeight: 1.1,
              }}
            >
              Unloop
            </span>
            <span
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 36,
                fontWeight: 400,
                color: "#7C6F62",
                marginTop: 16,
                lineHeight: 1.3,
              }}
            >
              Empty your head.
            </span>
          </div>
          <svg width={520} height={420} viewBox="0 0 520 420">
            {ARCS.map((a) => (
              <path
                key={a.seed}
                d={arcPath(a.cx - 300, a.cy - 80, a.r, a.arc, a.seed)}
                fill="none"
                stroke="#C4633E"
                strokeWidth={3}
                strokeLinecap="round"
                opacity={0.75}
              />
            ))}
            {ARCS.slice(0, 2).map((a) => (
              <path
                key={`closed-${a.seed}`}
                d={arcPath(a.cx - 280, a.cy + 60, a.r * 0.7, 1, a.seed + 5)}
                fill="none"
                stroke="#6E635A"
                strokeWidth={2.5}
                strokeLinecap="round"
                opacity={0.5}
              />
            ))}
          </svg>
        </div>
      </div>
    ),
    { ...size }
  );
}
