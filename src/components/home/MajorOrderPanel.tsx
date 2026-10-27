import { Countdown } from "@/components/hud/Countdown";
import { Markup } from "@/components/hud/Markup";
import type { MajorOrder } from "@/lib/data/assignment";
import { formatKst, formatPercent } from "@/lib/hd/format";

// Major orders (F-02-1, F-02-2, F-02-3, F-02-4, F-02-6). The only panel that uses the accent.
export function MajorOrderPanel({ orders }: { orders: MajorOrder[] }) {
  return (
    <section
      aria-labelledby="mo-title"
      className="hd-panel hd-panel--accent flex-[1_1_320px]"
    >
      <span className="hd-eyebrow">MAJOR ORDER</span>
      {orders.length === 0 && (
        <h2 id="mo-title" className="hd-panel__title">
          진행 중인 주요 명령 없음
        </h2>
      )}
      {orders.map((o, n) => (
        <article key={o.id} className="flex flex-col gap-4">
          <h2
            id={n === 0 ? "mo-title" : undefined}
            className="font-display text-[26px] font-bold leading-8 text-strong"
          >
            {o.title}
          </h2>
          <p className="text-sm leading-6 text-muted">
            <Markup text={o.briefing} />
          </p>
          <ul className="flex flex-col gap-3">
            {o.tasks.map((t, i) => (
              <li key={i} className="flex flex-col gap-1.5">
                <div className="hd-row">
                  <span>{t.text}</span>
                  {t.ratio !== null && (
                    <span className="hd-row__value hd-row__value--strong">
                      {formatPercent(t.ratio)}
                    </span>
                  )}
                </div>
                {t.ratio !== null && (
                  <div
                    className="hd-bar hd-bar--thick"
                    role="progressbar"
                    aria-label={t.text}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(t.ratio * 100)}
                  >
                    <div
                      className="hd-bar__fill"
                      style={{ width: formatPercent(t.ratio, 1) }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-subtle">남은 시간</dt>
            <dd className="text-strong">
              <Countdown to={o.expiresAt} />{" "}
              <span className="text-xs text-subtle">
                ({formatKst(o.expiresAt)} KST 만료)
              </span>
            </dd>
            {o.rewards.length > 0 && (
              <>
                <dt className="text-subtle">보상</dt>
                <dd className="text-body">{o.rewards.join(", ")}</dd>
              </>
            )}
          </dl>
        </article>
      ))}
    </section>
  );
}
