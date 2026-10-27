"use client";

import { type CSSProperties, useState } from "react";
import type { Front } from "@/lib/data/war";
import { formatNumber, formatPercent } from "@/lib/hd/format";
import { factionSummary } from "@/lib/hd/fronts";
import {
  flipsLeft,
  labelledPlanets,
  labelOnRight,
  toMapPercent,
} from "@/lib/hd/map";
import { factionOf } from "@/lib/hd/terms";
import { DefenseTooltip, factionStyle, LiberationTooltip } from "./MapTooltips";

// Decorative stars in the 640x380 map well (copied from the design reference).
const STARS = [
  [40, 30, 0.8],
  [210, 60, 0.6],
  [600, 40, 0.8],
  [520, 330, 0.6],
  [90, 350, 0.8],
  [380, 20, 0.6],
  [620, 250, 0.7],
  [20, 200, 0.6],
];

// Galaxy map with liberation/defense tooltips (F-01-7, F-01-3; design system README "지도").
// Every active front gets a dot; only some get a name label (SRS v4 §9).
export function GalaxyMap({
  fronts,
  moTargets,
}: {
  fronts: Front[];
  moTargets: number[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  const targets = new Set(moTargets);
  const labelled = labelledPlanets(fronts, targets);
  const tip = fronts.find((f) => f.index === open);
  const tipPos = tip && toMapPercent(tip.position.x, tip.position.y);
  const tipLeft = tipPos && flipsLeft(tipPos.left);

  // Tooltip placement from the reference: beside the planet, flipped on the right side;
  // liberation tips lean away from the edge, defense tips (taller) center vertically.
  const tipStyle =
    tip &&
    tipPos &&
    ({
      ...factionStyle(tip.faction),
      "--tip-left": `${tipPos.left}%`,
      "--tip-top": tip.defense ? "50%" : `${tipPos.top}%`,
      "--tip-tf": `translate(${tipLeft ? "calc(-100% - 28px)" : "28px"}, ${
        tip.defense ? "-50%" : tipPos.top > 60 ? "-85%" : "-15%"
      })`,
    } as CSSProperties);

  return (
    <section aria-labelledby="map-title" className="hd-panel flex-[2_1_640px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="map-title" className="hd-panel__title">
          은하계 전황{" "}
          <span className="font-mono text-xs font-normal tracking-normal text-subtle">
            · 행성에 마우스를 올리거나 눌러서 상태 확인
          </span>
        </h2>
        <ul
          aria-label="세력별 활성 전선"
          className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted"
        >
          {factionSummary(fronts).map((s) => (
            <li key={s.faction} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-[var(--faction)]"
                style={factionStyle(s.faction)}
              />
              {factionOf(s.faction)?.name} {s.fronts}곳 ·{" "}
              {formatNumber(s.players)}명
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full border border-dashed border-info"
            />
            방어전
          </li>
        </ul>
      </div>

      <div className="relative">
        <div
          className="relative aspect-[640/380] overflow-hidden bg-sunken"
          onKeyDown={(e) => e.key === "Escape" && setOpen(null)}
        >
          <svg
            viewBox="0 0 640 380"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute inset-0 size-full"
          >
            <g fill="#fff">
              {STARS.map(([cx, cy, r]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
              ))}
            </g>
            <g fill="none" stroke="#fff" strokeOpacity="0.12">
              <ellipse cx="320" cy="190" rx="90" ry="40" />
              <ellipse cx="320" cy="190" rx="190" ry="90" />
              <ellipse cx="320" cy="190" rx="290" ry="150" />
            </g>
            <circle
              cx="320"
              cy="190"
              r="22"
              fill="var(--color-accent)"
              fillOpacity="0.14"
            />
            <circle cx="320" cy="190" r="6" fill="var(--color-accent)" />
          </svg>
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[18px] font-mono text-[11px] tracking-[3px] text-strong"
          >
            SUPER EARTH
          </div>

          {fronts.map((f) => {
            const pos = toMapPercent(f.position.x, f.position.y);
            const right = labelOnRight(pos.left);
            const where = { left: `${pos.left}%`, top: `${pos.top}%` };
            return (
              <div key={f.index}>
                <button
                  type="button"
                  aria-label={
                    f.defense
                      ? `${f.name} 방어전, 방어 진행도 ${formatPercent(f.progress)}`
                      : `${f.name} 해방도 ${formatPercent(f.progress)}`
                  }
                  aria-describedby={open === f.index ? "map-tip" : undefined}
                  onMouseEnter={() => setOpen(f.index)}
                  onMouseLeave={() => setOpen(null)}
                  onFocus={() => setOpen(f.index)}
                  onBlur={() => setOpen(null)}
                  onClick={() => setOpen(f.index)}
                  className={`hd-marker absolute -translate-x-1/2 -translate-y-1/2 ${
                    targets.has(f.index) ? "hd-marker--major" : ""
                  }`}
                  style={{ ...where, ...factionStyle(f.faction) }}
                >
                  <span className="hd-marker__glow" />
                  <span className="hd-marker__dot" />
                  {f.defense && <span className="hd-marker__def" />}
                  {open === f.index && <span className="hd-marker__ring" />}
                </button>
                {labelled.has(f.index) && (
                  <span
                    aria-hidden="true"
                    className="hd-marker__label pointer-events-none absolute font-mono"
                    style={{
                      ...where,
                      transform: right
                        ? "translate(16px, -50%)"
                        : "translate(calc(-100% - 16px), -50%)",
                    }}
                  >
                    {f.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Beside the planet from sm up; below the map on phones, where it would not fit. */}
        {tip && (
          <div
            id="map-tip"
            role="tooltip"
            style={tipStyle}
            className={`hd-tip ${tip.defense ? "hd-tip--defense" : ""} z-10 mt-3 max-sm:w-full sm:absolute sm:left-[var(--tip-left)] sm:top-[var(--tip-top)] sm:mt-0 sm:[transform:var(--tip-tf)]`}
          >
            {tip.defense ? (
              <DefenseTooltip front={tip} />
            ) : (
              <LiberationTooltip front={tip} major={targets.has(tip.index)} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
