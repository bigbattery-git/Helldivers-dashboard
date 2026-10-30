"use client";

import { useState } from "react";
import { RANGES, type Point, type Range } from "@/lib/hd/series";
import { type ChartFormat, LineChart } from "./LineChart";

// A line chart with a range switch (24h/7d/30d). Every range is already in the props,
// so switching never asks the server (keeps ISR).
export function RangeChart({
  label,
  format,
  series,
}: {
  label: string;
  format: ChartFormat;
  series: { name: string; color: string; points: Record<Range, Point[]> }[];
}) {
  const [range, setRange] = useState<Range>("24h");
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="기간" className="flex justify-end gap-1">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            aria-pressed={range === r.value}
            onClick={() => setRange(r.value)}
            className="min-h-[32px] border border-line px-2 font-mono text-[11px] text-subtle aria-pressed:border-muted aria-pressed:text-strong focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
          >
            {r.label}
          </button>
        ))}
      </div>
      <LineChart
        label={`${label} (${RANGES.find((r) => r.value === range)!.label})`}
        format={format}
        series={series.map((s) => ({ ...s, points: s.points[range] }))}
      />
    </div>
  );
}
