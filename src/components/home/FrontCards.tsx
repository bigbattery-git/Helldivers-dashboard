import type { CSSProperties } from "react";
import { Countdown } from "@/components/hud/Countdown";
import { PlanetName } from "@/components/hud/PlanetName";
import { RemainingTime } from "@/components/hud/RemainingTime";
import type { Front } from "@/lib/data/war";
import { formatNumber, formatPercent, formatRate } from "@/lib/hd/format";
import { frontEta } from "@/lib/hd/fronts";
import { factionOf, factionStyle } from "@/lib/hd/terms";

function Eta({ front, slot }: { front: Front; slot: string }) {
  const eta = frontEta(front, slot);
  const won = front.defense ? "방어" : "해방";
  switch (eta.kind) {
    case "done":
      return <span>{front.defense ? "방어 성공" : "해방 완료"}</span>;
    case "victory":
      return (
        <span>
          {won} 예상 <RemainingTime to={eta.at!} />
        </span>
      );
    case "withdraw":
      return (
        <span>
          철수 예상 <RemainingTime to={eta.at!} />
        </span>
      );
    case "stalled":
      return <span>{front.perHour === null ? "추세 없음" : "정체"}</span>;
    case "fail":
      return <span className="text-danger">실패 예상</span>;
  }
}

// Colored by the rounded text so "0.000%/h" never shows green or red.
function Rate({ perHour }: { perHour: number }) {
  const text = formatRate(perHour, 3);
  const color = text.startsWith("+")
    ? "text-success"
    : text.startsWith("-")
      ? "text-danger"
      : undefined;
  return <span className={color}>{text}</span>;
}

// The most-dived fronts as cards, defenses always included (SRS v5 U-03, U-04).
// `fronts` is already picked and ordered by `topFronts`.
export function FrontCards({
  fronts,
  total,
  slot,
  moTargets,
}: {
  fronts: Front[];
  total: number;
  slot: string | null;
  moTargets: number[];
}) {
  return (
    <section aria-labelledby="fronts-title" className="hd-panel">
      <h2 id="fronts-title" className="hd-panel__title">
        주요 전선
      </h2>
      {fronts.length === 0 ? (
        <p className="text-sm text-subtle">진행 중인 전선이 없습니다.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-3">
          {fronts.map((f) => (
            <li
              key={f.index}
              className={f.defense ? "hd-front hd-front--defense" : "hd-front"}
              style={factionStyle(f.faction)}
            >
              <div className="hd-front__head">
                <span className="hd-front__kind">
                  {f.defense ? "방어" : "해방"}
                </span>
                <span className="hd-front__eta">
                  {slot && <Eta front={f} slot={slot} />}
                  {f.defense && (
                    <span className="text-accent">
                      남은 <Countdown to={f.defense.expiresAt} />
                    </span>
                  )}
                </span>
              </div>
              <div>
                <h3 className="hd-front__name">
                  <PlanetName name={f.name} nameEn={f.nameEn} />
                </h3>
                <div className="hd-front__meta">
                  {f.sector && `${f.sector} 섹터 · `}
                  <span style={{ color: "var(--faction)" }}>
                    {factionOf(f.faction)?.name}
                  </span>
                  {moTargets.includes(f.index) && (
                    <span className="text-accent"> · 주요 명령</span>
                  )}
                </div>
              </div>
              {/* Decorative: the same figure follows as text. */}
              <div className="hd-bar" aria-hidden="true">
                <div
                  className="hd-bar__fill"
                  style={
                    {
                      width: formatPercent(f.progress, 1),
                      "--fill": f.defense
                        ? "var(--color-info)"
                        : "var(--faction)",
                    } as CSSProperties
                  }
                />
              </div>
              <div className="hd-front__nums">
                <span>
                  {formatPercent(f.progress, 4)} {f.defense ? "방어" : "해방"}
                </span>
                {f.perHour !== null && <Rate perHour={f.perHour} />}
              </div>
              <div className="hd-front__foot">
                <span>투입 인원</span>
                <span className="text-strong">
                  {formatNumber(f.players)}명
                  {total > 0 && ` · ${formatPercent(f.players / total)}`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
