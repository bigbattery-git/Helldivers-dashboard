import { formatKst, formatNumber, formatPercent } from "@/lib/hd/format";
import { linePath, type Point } from "@/lib/hd/series";

export type ChartFormat = "percent" | "number";
export type ChartSeries = { name: string; color: string; points: Point[] };

const W = 600;
const H = 180;

export const formatValue = (v: number, format: ChartFormat) =>
  format === "percent" ? formatPercent(v, 1) : formatNumber(Math.round(v));

// Line chart drawn as inline SVG, no chart library (SRS v4 §6). The picture is decorative
// for screen readers; the label and the value table carry the numbers (Q-03).
export function LineChart({
  label,
  series,
  format,
}: {
  label: string;
  series: ChartSeries[];
  format: ChartFormat;
}) {
  const all = series.flatMap((s) => s.points);
  if (all.length < 2)
    return (
      <p className="py-10 text-center text-sm text-subtle">
        아직 그래프를 그릴 만큼 데이터가 쌓이지 않았습니다.
      </p>
    );
  const times = all.map((p) => Date.parse(p.at));
  const values = all.map((p) => p.value);
  const box =
    format === "percent"
      ? { v0: 0, v1: 1 }
      : { v0: Math.min(...values), v1: Math.max(...values) };
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const fmt = (v: number) => formatValue(v, format);
  const summary = series
    .filter((s) => s.points.length)
    .map((s) => {
      const vs = s.points.map((p) => p.value);
      return {
        name: s.name,
        color: s.color,
        latest: vs.at(-1)!,
        min: Math.min(...vs),
        max: Math.max(...vs),
      };
    });

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-0.5 text-right font-mono text-[11px] text-subtle tabular-nums">
          <span>{fmt(box.v1)}</span>
          <span>{fmt(box.v0)}</span>
        </div>
        <svg
          role="img"
          aria-label={`${label}: ${summary
            .map(
              (s) =>
                `${s.name} 최근 ${fmt(s.latest)}, 최저 ${fmt(s.min)}, 최고 ${fmt(s.max)}`,
            )
            .join("; ")}`}
          viewBox={`0 -2 ${W} ${H + 4}`}
          preserveAspectRatio="none"
          className="h-[180px] w-full border-y border-line bg-sunken"
        >
          {series.map((s) => (
            <path
              key={s.name}
              d={linePath(s.points, { t0, t1, ...box }, W, H)}
              fill="none"
              stroke={s.color}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between font-mono text-[11px] text-subtle">
        <span>{formatKst(new Date(t0))}</span>
        <span>{formatKst(new Date(t1))} KST</span>
      </div>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer text-subtle focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">
          수치 보기
        </summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-subtle">
            <tr>
              <th className="font-normal">항목</th>
              <th className="font-normal">최근</th>
              <th className="font-normal">최저</th>
              <th className="font-normal">최고</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.name}>
                <td>
                  <span
                    aria-hidden="true"
                    className="mr-1.5 inline-block size-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.name}
                </td>
                <td>{fmt(s.latest)}</td>
                <td>{fmt(s.min)}</td>
                <td>{fmt(s.max)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
