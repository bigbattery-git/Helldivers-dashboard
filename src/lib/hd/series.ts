// Time series for charts (F-04, F-04-5): 24h shows raw 15-minute slots, 7d/30d average per hour.
export type Point = { at: string; value: number };
export type Range = "24h" | "7d" | "30d";

const HOUR_MS = 3_600_000;

export const RANGES: {
  value: Range;
  label: string;
  hours: number;
  bucketMs: number | null;
}[] = [
  { value: "24h", label: "24시간", hours: 24, bucketMs: null },
  { value: "7d", label: "7일", hours: 168, bucketMs: HOUR_MS },
  { value: "30d", label: "30일", hours: 720, bucketMs: HOUR_MS },
];

// Mean per bucket of `ms`, stamped with the bucket start.
export function bucketAverage(points: Point[], ms: number): Point[] {
  const sums = new Map<number, { sum: number; n: number }>();
  for (const p of points) {
    const key = Math.floor(new Date(p.at).getTime() / ms) * ms;
    const s = sums.get(key) ?? { sum: 0, n: 0 };
    s.sum += p.value;
    s.n += 1;
    sums.set(key, s);
  }
  return [...sums]
    .sort(([a], [b]) => a - b)
    .map(([key, s]) => ({
      at: new Date(key).toISOString(),
      value: s.sum / s.n,
    }));
}

// The window ending at the newest point, bucketed for the longer ranges.
export function forRange(points: Point[], range: Range): Point[] {
  const r = RANGES.find((x) => x.value === range)!;
  const last = points.at(-1);
  if (!last) return [];
  const from = new Date(last.at).getTime() - r.hours * HOUR_MS;
  const inside = points.filter((p) => new Date(p.at).getTime() > from);
  return r.bucketMs ? bucketAverage(inside, r.bucketMs) : inside;
}

// Every range at once, so the browser can switch without asking the server (keeps ISR).
export const allRanges = (points: Point[]) =>
  Object.fromEntries(
    RANGES.map((r) => [r.value, forRange(points, r.value)]),
  ) as Record<Range, Point[]>;

// SVG path for one series on shared time and value axes.
export function linePath(
  points: Point[],
  box: { t0: number; t1: number; v0: number; v1: number },
  width: number,
  height: number,
) {
  const tSpan = box.t1 - box.t0 || 1;
  const vSpan = box.v1 - box.v0 || 1;
  const r = (n: number) => Math.round(n * 10) / 10;
  return points
    .map((p, i) => {
      const x = ((new Date(p.at).getTime() - box.t0) / tSpan) * width;
      const y = height - ((p.value - box.v0) / vSpan) * height;
      return `${i ? "L" : "M"}${r(x)},${r(y)}`;
    })
    .join("");
}
