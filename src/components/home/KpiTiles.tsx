import type { PlayerPoint } from "@/lib/data/stats";
import type { WarOverview } from "@/lib/data/war";
import { formatNumber } from "@/lib/hd/format";
import { sparkline } from "@/lib/hd/sparkline";

const W = 140;
const H = 28;

// Header KPI tiles (design system "StatTile"): galaxy totals and Steam players with a 24h line.
export function KpiTiles({
  totals,
  players,
}: {
  totals: WarOverview["totals"] | undefined;
  players: PlayerPoint[];
}) {
  const latest = players.at(-1)?.players;
  const line = sparkline(
    players.map((p) => p.players),
    W,
    H,
  );
  return (
    <div className="flex flex-wrap gap-3">
      <div className="hd-stat">
        <div className="hd-stat__label">ACTIVE DIVERS</div>
        <div className="hd-stat__value hd-stat__value--accent">
          {totals ? formatNumber(totals.players) : "—"}
        </div>
      </div>
      <div className="hd-stat">
        <div className="hd-stat__label">PLANETS LIBERATED</div>
        <div className="hd-stat__value">
          {totals ? `${totals.liberated} / ${totals.planets}` : "—"}
        </div>
      </div>
      <div className="hd-stat">
        <div className="hd-stat__label">STEAM PLAYERS</div>
        <div className="hd-stat__value">
          {latest === undefined ? "—" : formatNumber(latest)}
        </div>
        {line && (
          <svg
            role="img"
            aria-label={`최근 24시간 Steam 동접자 최저 ${formatNumber(line.min)}, 최고 ${formatNumber(line.max)}`}
            viewBox={`0 -1 ${W} ${H + 2}`}
            width={W}
            height={H}
            className="mt-1 block text-muted"
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
        <div className="mt-1 text-[11px] text-subtle">24시간 · PS5 제외</div>
      </div>
    </div>
  );
}
