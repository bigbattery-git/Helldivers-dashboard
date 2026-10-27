"use client";

import { type CSSProperties, useState } from "react";
import { Countdown } from "@/components/hud/Countdown";
import { PlanetName } from "@/components/hud/PlanetName";
import type { Front } from "@/lib/data/war";
import { formatNumber, formatPercent, formatRate } from "@/lib/hd/format";
import {
  FRONT_SORTS,
  type FrontSort,
  factionSummary,
  sortFronts,
} from "@/lib/hd/fronts";
import { factionColor, factionOf } from "@/lib/hd/terms";

const faction = (id: number) =>
  ({ "--faction": factionColor(id) }) as CSSProperties;

// Active fronts (F-01-1, F-01-2, F-01-3, F-01-4). Sorting stays in the browser so the
// page itself keeps its cached static shell (SRS v4 §4).
export function FrontList({
  fronts,
  moTargets,
}: {
  fronts: Front[];
  moTargets: number[];
}) {
  const [sort, setSort] = useState<FrontSort>("default");
  const targets = new Set(moTargets);
  const list = sortFronts(fronts, sort, targets);

  return (
    <section
      aria-labelledby="fronts-title"
      className="hd-panel flex-[1_1_400px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="fronts-title" className="hd-panel__title">
          진행 중인 전선
        </h2>
        <div role="group" aria-label="정렬" className="flex gap-1">
          {FRONT_SORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={sort === s.value}
              onClick={() => setSort(s.value)}
              className="min-h-[44px] border border-line px-2 font-mono text-[11px] text-subtle aria-pressed:border-muted aria-pressed:text-strong focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <ul aria-label="진영별 요약" className="flex flex-wrap gap-2">
        {factionSummary(fronts).map((s) => (
          <li
            key={s.faction}
            style={faction(s.faction)}
            className="border-l-[3px] border-[var(--faction)] bg-base px-3 py-1.5 text-xs text-muted"
          >
            <span className="text-body">{factionOf(s.faction)?.name}</span> 전선{" "}
            {s.fronts}곳 · {formatNumber(s.players)}명
          </li>
        ))}
      </ul>

      {list.length === 0 && (
        <p className="text-sm text-subtle">진행 중인 전선이 없습니다.</p>
      )}
      <ul className="flex flex-col gap-2">
        {list.map((f) => (
          <li key={f.index} className="hd-mission" style={faction(f.faction)}>
            <div className="min-w-0">
              <div className="hd-mission__title">
                <PlanetName name={f.name} nameEn={f.nameEn} />
                {targets.has(f.index) && (
                  <span className="ml-2 font-mono text-[11px] text-accent">
                    주요 명령
                  </span>
                )}
              </div>
              <div className="hd-mission__planet">
                {f.sector && `${f.sector} 섹터 · `}
                {factionOf(f.faction)?.name}
                {f.defense ? " 공격 방어 중" : ""}
              </div>
            </div>
            <div className="hd-mission__meta text-right">
              <div>
                {f.defense && <span className="text-info">방어 </span>}
                {formatPercent(f.progress)} · {formatNumber(f.players)}명
              </div>
              {f.defense ? (
                <div className="text-info">
                  <Countdown to={f.defense.expiresAt} />
                </div>
              ) : (
                f.perHour !== null && (
                  <div className="text-subtle">{formatRate(f.perHour)}</div>
                )
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
