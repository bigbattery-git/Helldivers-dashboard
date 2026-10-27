"use client";

import { useState } from "react";
import { RANGES, type Point, type Range } from "@/lib/hd/series";
import { type ChartFormat, LineChart } from "./LineChart";

export type ChartView = {
  key: string;
  label: string;
  format: ChartFormat;
  series: { name: string; color: string; points: Record<Range, Point[]> }[];
};

function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className="min-h-[32px] border border-line px-2 font-mono text-[11px] text-subtle aria-pressed:border-muted aria-pressed:text-strong focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// A chart with range (24h/7d/30d) and, when there are several views, a metric switch.
// Every range is already in the props, so switching never asks the server (keeps ISR).
export function RangeChart({ views }: { views: ChartView[] }) {
  const [viewKey, setViewKey] = useState(views[0].key);
  const [range, setRange] = useState<Range>("24h");
  const view = views.find((v) => v.key === viewKey) ?? views[0];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {views.length > 1 ? (
          <Toggle
            label="항목"
            options={views.map((v) => ({ value: v.key, label: v.label }))}
            value={view.key}
            onChange={setViewKey}
          />
        ) : (
          <span />
        )}
        <Toggle
          label="기간"
          options={RANGES}
          value={range}
          onChange={setRange}
        />
      </div>
      <LineChart
        label={`${view.label} (${RANGES.find((r) => r.value === range)!.label})`}
        format={view.format}
        series={view.series.map((s) => ({
          name: s.name,
          color: s.color,
          points: s.points[range],
        }))}
      />
    </div>
  );
}
