import type { Metadata } from "next";
import { RangeChart } from "@/components/hud/RangeChart";
import { SubpageHeader } from "@/components/hud/SubpageHeader";
import { getAssignmentSeries } from "@/lib/data/assignment";
import { getLastCollection } from "@/lib/data/collection";
import {
  getOwnerPlayers,
  getPlayerSeries,
  getWarStatsPair,
} from "@/lib/data/stats";
import { formatKst, formatNumber, formatPercent } from "@/lib/hd/format";
import { allRanges } from "@/lib/hd/series";
import { factionShares, statsDelta } from "@/lib/hd/stats";
import { factionColor, factionOf } from "@/lib/hd/terms";

export const metadata: Metadata = { title: "통계 · Helldivers Dashboard" };

const DAYS_30 = 720;

// Galaxy-wide statistics (SRS v2 F-04, F-02-5): Steam players, faction shares,
// war counters over the last day and major-order progress.
export default async function StatsPage() {
  const [players, owners, pair, orders, last] = await Promise.all([
    getPlayerSeries(DAYS_30),
    getOwnerPlayers(DAYS_30),
    getWarStatsPair(),
    getAssignmentSeries(),
    getLastCollection(),
  ]);
  const shares = factionShares(owners);
  const delta = pair ? statsDelta(pair.latest.stats, pair.before.stats) : [];
  const successRate = Number(pair?.latest.stats.missionSuccessRate);

  return (
    <main className="mx-auto flex w-full max-w-[1392px] flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
      <SubpageHeader eyebrow="STATS" title="은하 전체 통계" last={last} />

      <div className="flex flex-wrap gap-5">
        <section
          aria-labelledby="players-title"
          className="hd-panel min-w-0 flex-[1_1_480px]"
        >
          <h2 id="players-title" className="hd-panel__title">
            Steam 동접자
          </h2>
          <p className="text-xs text-subtle">
            Steam 기준, PS5는 포함하지 않습니다.
          </p>
          <RangeChart
            label="Steam 동접자"
            format="number"
            series={[
              {
                name: "동접자",
                color: "var(--color-muted)",
                points: allRanges(
                  players.map((p) => ({ at: p.slot, value: p.players })),
                ),
              },
            ]}
          />
        </section>

        <section
          aria-labelledby="shares-title"
          className="hd-panel min-w-0 flex-[1_1_480px]"
        >
          <h2 id="shares-title" className="hd-panel__title">
            진영별 투입 인원 비율
          </h2>
          <p className="text-xs text-subtle">
            적이 차지한 행성의 인원만 셉니다. 방어전(슈퍼지구 행성) 인원은 빠진
            근사치입니다.
          </p>
          <RangeChart
            label="진영별 투입 인원 비율"
            format="percent"
            series={Object.entries(shares).map(([faction, points]) => ({
              name: factionOf(Number(faction))?.name ?? faction,
              color: factionColor(Number(faction)),
              points: allRanges(points),
            }))}
          />
        </section>
      </div>

      <section aria-labelledby="war-title" className="hd-panel">
        <h2 id="war-title" className="hd-panel__title">
          전투 통계
        </h2>
        {pair ? (
          <>
            <p className="text-xs text-subtle">
              {formatKst(pair.before.slot)} → {formatKst(pair.latest.slot)} KST
              사이 증가량
            </p>
            <div className="flex flex-wrap gap-3">
              {delta.map((d) => (
                <div key={d.key} className="hd-stat">
                  <div className="hd-stat__label">{d.label}</div>
                  <div className="hd-stat__value">+{formatNumber(d.delta)}</div>
                  <div className="font-mono text-[11px] text-subtle">
                    누적 {formatNumber(d.total)}
                  </div>
                </div>
              ))}
              {Number.isFinite(successRate) && (
                <div className="hd-stat">
                  <div className="hd-stat__label">임무 성공률</div>
                  <div className="hd-stat__value">
                    {formatPercent(successRate / 100)}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-subtle">
            비교할 전투 통계가 아직 두 번 이상 모이지 않았습니다.
          </p>
        )}
      </section>

      {orders.map((o) => (
        <section key={o.id} aria-labelledby={`mo-${o.id}`} className="hd-panel">
          <h2 id={`mo-${o.id}`} className="hd-panel__title">
            주요 명령 진행률 · {o.title}
          </h2>
          <RangeChart
            label="주요 명령 진행률"
            format="percent"
            series={o.tasks.map((t) => ({
              name: t.text,
              color: t.race ? factionColor(t.race) : "var(--color-accent)",
              points: allRanges(t.points),
            }))}
          />
        </section>
      ))}
    </main>
  );
}
