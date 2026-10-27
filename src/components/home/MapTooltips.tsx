"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { Countdown } from "@/components/hud/Countdown";
import type { Front } from "@/lib/data/war";
import { defenseOutlook, enemyProgress } from "@/lib/hd/defense";
import { tooltipEffects } from "@/lib/hd/effects";
import { formatNumber, formatPercent, formatRate } from "@/lib/hd/format";
import { factionOf } from "@/lib/hd/terms";

// Tooltip contents for map planets (design system README "LiberationTooltip", "DefenseTooltip"),
// also used large on the planet page. Time-based figures wait for the browser clock:
// the planet page is a cached server render that cannot know the current time.
function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Bar({
  ratio,
  fill,
  thick,
}: {
  ratio: number;
  fill: string;
  thick?: boolean;
}) {
  return (
    <div className={thick ? "hd-bar hd-bar--thick" : "hd-bar"}>
      <div
        className="hd-bar__fill"
        style={
          { width: formatPercent(ratio, 1), "--fill": fill } as CSSProperties
        }
      />
    </div>
  );
}

function Effects({ ids }: { ids: number[] }) {
  const effects = tooltipEffects(ids);
  if (effects.length === 0) return null;
  return (
    <div className="hd-hazards hd-tip__divider">
      <span className="hd-section-label">행성 요소</span>
      {effects.map((e) => (
        <div
          key={e.name}
          className="hd-hazard"
          style={
            e.kind === "enemy"
              ? ({ "--hz": "var(--faction)" } as CSSProperties)
              : undefined
          }
        >
          <span className="hd-hazard__name">{e.name}</span>
          <span className="hd-hazard__kind">
            {e.kind === "enemy" ? "적 변종" : "환경"}
          </span>
          <div className="hd-hazard__desc">{e.desc}</div>
        </div>
      ))}
    </div>
  );
}

export function LiberationTooltip({
  front,
  major,
}: {
  front: Front;
  major: boolean;
}) {
  const faction = factionOf(front.faction)?.name;
  return (
    <>
      <div className="hd-tip__top">
        <span className="hd-tip__title">{front.name}</span>
        <span className="hd-tip__faction">{faction}</span>
      </div>
      <div className="hd-tip__meta">
        {front.sector ? `${front.sector} 섹터 · ` : ""}
        {major ? "주요 명령 · 해방 중" : "해방 중"}
      </div>
      <div className="flex flex-col gap-1">
        <div className="hd-row">
          <span>해방도</span>
          <span className="hd-row__value hd-row__value--strong">
            {formatPercent(front.progress)}
          </span>
        </div>
        <Bar ratio={front.progress} fill="var(--faction)" />
      </div>
      <div className="hd-row">
        <span>투입 인원</span>
        <span className="hd-row__value">{formatNumber(front.players)}</span>
      </div>
      {front.perHour !== null && (
        <div className="hd-row">
          <span>시간당 변화</span>
          <span className="hd-row__value">{formatRate(front.perHour)}</span>
        </div>
      )}
      <Effects ids={front.effectIds} />
    </>
  );
}

const HEX = "M6 1 L11 4 V8 L6 11 L1 8 V4 Z";
const SHIELD = "M14 3 L24 7 V14 C24 20 19 24 14 26 C9 24 4 20 4 14 V7 Z";

export function DefenseTooltip({ front }: { front: Front }) {
  const defense = front.defense!;
  const now = useNow();
  const start = new Date(defense.startedAt);
  const end = new Date(defense.expiresAt);
  const enemy = now ? enemyProgress(start, end, now) : 0;
  const enemyPerHour = 3_600_000 / (end.getTime() - start.getTime());
  const outlook =
    now && defenseOutlook(front.progress, front.perHour, end, now);
  return (
    <>
      <div className="hd-tip__head">
        <span
          className="flex items-center gap-1.5"
          style={{ color: "var(--faction)" }}
        >
          <svg
            viewBox="0 0 12 12"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d={HEX} />
          </svg>
          {factionOf(front.faction)?.name}
        </span>
        {front.sector && <span>{front.sector} 섹터</span>}
      </div>
      {/* No planet images in our data: the slot stays an empty well (README "DefenseTooltip"). */}
      <div className="hd-tip__banner" aria-hidden="true" />
      <div className="hd-tip__body">
        <div className="hd-tip__name-row">
          <svg
            viewBox="0 0 28 28"
            width="24"
            height="24"
            fill="none"
            stroke="var(--color-info)"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d={SHIELD} />
          </svg>
          <div>
            <div className="hd-tip__kind">방어</div>
            <div className="hd-tip__title">{front.name}</div>
          </div>
        </div>
        <p className="hd-tip__desc">
          행성이 공격받고 있습니다. 적의 공세가 완료되기 전에 방어 진행도를
          100%로 끌어올려야 합니다.
        </p>
        <div className="hd-timer">
          <span className="hd-timer__label">남은 시간</span>
          <span className="hd-timer__value">
            <Countdown to={defense.expiresAt} />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="hd-row">
            <span>방어 진행 상황</span>
            <span className="hd-row__value">
              {front.perHour !== null && `${formatRate(front.perHour)} · `}
              {formatPercent(front.progress)}
            </span>
          </div>
          <Bar ratio={front.progress} fill="var(--color-info)" thick />
        </div>
        <div className="flex flex-col gap-1">
          <div className="hd-row">
            <span>적의 공세 상황</span>
            <span className="hd-row__value">
              {formatRate(enemyPerHour)} · {now ? formatPercent(enemy) : "—"}
            </span>
          </div>
          <Bar ratio={enemy} fill="var(--faction)" thick />
        </div>
        <Effects ids={front.effectIds} />
        <div className="hd-row">
          <span>투입 인원</span>
          <span className="hd-row__value">{formatNumber(front.players)}</span>
        </div>
      </div>
      {outlook && (
        <div className="hd-tip__foot">
          <span>예상 결과</span>
          <span
            className={outlook.good ? "hd-outlook--good" : "hd-outlook--bad"}
          >
            {outlook.text}
          </span>
        </div>
      )}
    </>
  );
}
