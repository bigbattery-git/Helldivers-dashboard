import { Markup } from "@/components/hud/Markup";
import { RemainingTime } from "@/components/hud/RemainingTime";
import { isKorean } from "@/lib/collect/util";
import type { MajorOrder } from "@/lib/data/assignment";
import { formatKst, formatPercent } from "@/lib/hd/format";

// Major orders in the reference layout (F-02-1, F-02-2, F-02-3, F-02-4, F-02-6):
// title, briefing, one bar per task where the reference has a single "진행도" bar,
// then remaining time and reward side by side. The only panel that uses the accent.
export function MajorOrderPanel({ orders }: { orders: MajorOrder[] }) {
  return (
    <section
      aria-labelledby="mo-title"
      className="hd-panel hd-panel--accent flex-[1_1_320px]"
    >
      <span className="hd-eyebrow flex items-center gap-2">
        <svg
          viewBox="0 0 10 10"
          width="10"
          height="10"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5 1 L9 9 H1 Z" />
        </svg>
        MAJOR ORDER
      </span>
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
            {/* English text: not translated yet, or seen only through the community mirror (F-05-2). */}
            {(o.original || !isKorean(o.title) || !isKorean(o.briefing)) && (
              <>
                {" "}
                <span className="ml-1 align-middle font-mono text-xs font-normal text-subtle">
                  {o.original ? "자동 번역" : "원문"}
                </span>
              </>
            )}
          </h2>
          <p className="text-sm leading-6 text-muted">
            <Markup text={o.briefing} />
          </p>
          {o.original && (
            <details className="-mt-2 text-xs leading-5 text-subtle">
              <summary className="cursor-pointer list-none font-mono [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">
                (원문)
              </summary>
              <div lang="en" className="mt-2 flex flex-col gap-1">
                <span className="font-medium">{o.original.title}</span>
                <span>
                  <Markup text={o.original.briefing} />
                </span>
              </div>
            </details>
          )}
          <ul className="flex flex-col gap-3">
            {o.tasks.map((t, i) => (
              <li key={i} className="flex flex-col gap-1.5">
                <div className="hd-row">
                  <span>{o.tasks.length === 1 ? "진행도" : t.text}</span>
                  {t.ratio !== null && (
                    <span className="hd-row__value">
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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 bg-base p-4">
              <span className="text-xs text-subtle">남은 시간</span>
              <span className="font-display text-2xl font-bold text-strong">
                <RemainingTime to={o.expiresAt} />
              </span>
              <span className="text-[11px] text-subtle">
                {formatKst(o.expiresAt)} KST 만료
              </span>
            </div>
            <div className="flex flex-col gap-1 bg-base p-4">
              <span className="text-xs text-subtle">보상</span>
              <span className="font-display text-2xl font-bold text-strong">
                {o.rewards.join(", ") || "—"}
              </span>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
