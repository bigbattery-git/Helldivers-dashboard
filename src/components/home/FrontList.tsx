"use client";

import { useState } from "react";
import Link from "next/link";
import type { Front } from "@/lib/data/war";
import { formatNumber, formatPercent } from "@/lib/hd/format";
import { FRONT_SORTS, type FrontSort, sortFronts } from "@/lib/hd/fronts";
import { factionOf, factionStyle } from "@/lib/hd/terms";

const SHOWN = 6;

// Active fronts in the reference's mission-row style (F-01-1, F-01-2). Sorting and the
// show-all toggle stay in the browser so the page keeps its cached static shell.
// The per-faction summary (F-01-4) lives in the map legend.
export function FrontList({
  fronts,
  moTargets,
}: {
  fronts: Front[];
  moTargets: number[];
}) {
  const [sort, setSort] = useState<FrontSort>("default");
  const [all, setAll] = useState(false);
  const targets = new Set(moTargets);
  const sorted = sortFronts(fronts, sort, targets);
  const list = all ? sorted : sorted.slice(0, SHOWN);

  return (
    <section
      aria-labelledby="fronts-title"
      className="hd-panel flex-[1_1_400px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="fronts-title" className="hd-panel__title">
          진행 중인 전선
        </h2>
        <label className="flex items-center gap-2 font-mono text-[11px] text-subtle">
          정렬
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as FrontSort)}
            className="min-h-[32px] border border-line bg-base px-2 text-body focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
          >
            {FRONT_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.length === 0 && (
        <p className="text-sm text-subtle">진행 중인 전선이 없습니다.</p>
      )}
      <ul className="flex flex-col gap-2.5">
        {list.map((f) => (
          <li key={f.index}>
            {/* The whole row opens the planet page; its "(원문)" toggle lives there. */}
            <Link
              href={`/planets/${f.index}`}
              className="hd-mission hover:bg-sunken focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
              style={factionStyle(f.faction)}
            >
              <div className="min-w-0">
                <div className="hd-mission__title">{f.name}</div>
                <div className="hd-mission__planet">
                  {f.sector && `${f.sector} 섹터 · `}
                  {factionOf(f.faction)?.name}
                  {targets.has(f.index) && " · 주요 명령"}
                  {f.defense && " · 방어 중"}
                </div>
              </div>
              <div className="hd-mission__meta">
                {f.defense && <span className="text-info">방어 </span>}
                {formatPercent(f.progress)} · {formatNumber(f.players)}명
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {fronts.length > SHOWN && (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll(!all)}
          className="min-h-[44px] border border-line font-mono text-xs text-muted hover:text-strong focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
        >
          {all ? "접기" : `전체 ${fronts.length}곳 보기`}
        </button>
      )}
    </section>
  );
}
