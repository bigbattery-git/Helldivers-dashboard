import Link from "next/link";
import { FallbackBadge } from "@/components/hud/FallbackBadge";
import { StaleBadge } from "@/components/hud/StaleBadge";
import type { LastCollection } from "@/lib/data/collection";
import type { PlayerPoint } from "@/lib/data/stats";
import type { WarOverview } from "@/lib/data/war";
import { warDay } from "@/lib/hd/defense";
import { formatKst, formatNumber } from "@/lib/hd/format";
import { sparkline } from "@/lib/hd/sparkline";

const W = 120;
const H = 24;

// Page header from the design reference: hex mark, "GALACTIC WAR · DAY N", title, KPI tiles
// on the right. The last tile replaces the reference's sample-data stamp with the real
// collection time and the stale badge (F-05-1).
export function PageHeader({
  war,
  players,
  last,
}: {
  war: WarOverview | null;
  players: PlayerPoint[];
  last: LastCollection | null;
}) {
  const day =
    war?.warStartedAt && warDay(new Date(war.warStartedAt), new Date(war.slot));
  const latest = players.at(-1)?.players;
  const line = sparkline(
    players.map((p) => p.players),
    W,
    H,
  );

  return (
    <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
      <div className="flex items-center gap-4">
        <svg
          viewBox="0 0 40 40"
          width="44"
          height="44"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M20 3 L35 11 V29 L20 37 L5 29 V11 Z" />
          <path d="M20 12 V28 M12 20 H28" />
        </svg>
        <div>
          <div className="hd-eyebrow">
            GALACTIC WAR{day ? ` · DAY ${formatNumber(day)}` : ""}
          </div>
          <h1 className="font-display text-4xl font-bold text-strong">
            전술 지휘 대시보드
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="hd-stat">
          <div className="hd-stat__label">ACTIVE DIVERS</div>
          <div className="hd-stat__value hd-stat__value--accent">
            {war ? formatNumber(war.totals.players) : "—"}
          </div>
        </div>
        <div className="hd-stat">
          <div className="hd-stat__label">PLANETS LIBERATED</div>
          <div className="hd-stat__value hd-stat__value--info">
            {war ? `${war.totals.liberated} / ${war.totals.planets}` : "—"}
          </div>
        </div>
        {/* Entry to the stats page (SRS v4 §9). */}
        <Link
          href="/stats"
          className="hd-stat block hover:border-muted focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
        >
          <div className="hd-stat__label">
            STEAM PLAYERS <span aria-hidden="true">↗</span>
            <span className="sr-only">, 통계 화면으로 이동</span>
          </div>
          <div className="flex items-end gap-3">
            <div className="hd-stat__value">
              {latest === undefined ? "—" : formatNumber(latest)}
            </div>
            {line && (
              <svg
                role="img"
                aria-label={`최근 24시간 Steam 동접자(PS5 제외) 최저 ${formatNumber(line.min)}, 최고 ${formatNumber(line.max)}`}
                viewBox={`0 -1 ${W} ${H + 2}`}
                width={W / 2}
                height={H}
                preserveAspectRatio="none"
                className="mb-1 text-muted"
              >
                <path
                  d={line.path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
          </div>
        </Link>
        <div className="hd-stat">
          <div className="hd-stat__label">LAST UPDATE</div>
          <div className="hd-stat__value">
            {last ? formatKst(last.startedAt) : "—"}
          </div>
          <div className="flex flex-wrap gap-1">
            <StaleBadge last={last} />
            <FallbackBadge last={last} />
          </div>
        </div>
      </div>
    </header>
  );
}
