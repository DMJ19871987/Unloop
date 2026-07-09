export interface Point {
  x: number;
  y: number;
}

/** Correlated seeded noise in [-1, 1] — smooth along parameter t ∈ [0, 1]. */
export function smoothSeededNoise(seed: number, t: number): number {
  const s = seed * 0.0173;
  return (
    Math.sin(s + t * 4.2) * 0.45 +
    Math.sin(s * 1.7 + t * 1.3 + 2.1) * 0.3 +
    Math.sin(s * 2.3 + t * 7.1 + 0.8) * 0.25
  );
}

function catmullRomToBezierPath(points: Point[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/**
 * Build a single incomplete-circle arc path.
 * ~24 points, Catmull-Rom smoothed, ±2.5% radial jitter from visualSeed.
 */
export function buildLoopArcPath(
  cx: number,
  cy: number,
  radius: number,
  arcCompleteness: number,
  visualSeed: number,
  pointCount = 24
): string {
  const sweep = Math.max(0.05, Math.min(1, arcCompleteness)) * Math.PI * 2;
  const startAngle =
    -Math.PI / 2 + ((visualSeed % 97) / 97) * 0.25;

  const points: Point[] = [];
  for (let i = 0; i < pointCount; i++) {
    const t = pointCount === 1 ? 0 : i / (pointCount - 1);
    const angle = startAngle + t * sweep;
    const jitter = smoothSeededNoise(visualSeed, t) * 0.025 * radius;
    const r = radius + jitter;
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }

  return catmullRomToBezierPath(points);
}

/** Optional ±15% stroke emphasis via a single duplicate path at lower opacity. */
export function arcStrokeLayers(
  baseWidth: number,
  visualSeed: number
): { width: number; opacity: number }[] {
  const variation = 0.85 + ((visualSeed % 31) / 31) * 0.3;
  return [
    { width: baseWidth * variation, opacity: 1 },
    { width: baseWidth * variation * 1.08, opacity: 0.18 },
  ];
}
