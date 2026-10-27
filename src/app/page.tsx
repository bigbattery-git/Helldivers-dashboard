import { PlanetName } from "@/components/hud/PlanetName";
import { getAssignments } from "@/lib/data/assignment";
import { getNews } from "@/lib/data/news";
import { getPlayerSeries } from "@/lib/data/stats";
import { getWarOverview } from "@/lib/data/war";
import { formatKst, formatNumber, formatPercent } from "@/lib/hd/format";
import { stripMarkup } from "@/lib/hd/markup";
import { factionOf } from "@/lib/hd/terms";

// Placeholder home for the foundation PR: proves every data function renders.
// The real dashboard layout comes in PR B (SRS v4 §8).
export default async function Home() {
  const [war, orders, news, players] = await Promise.all([
    getWarOverview(),
    getAssignments(),
    getNews(5),
    getPlayerSeries(24),
  ]);
  const fronts = [...(war?.fronts ?? [])].sort((a, b) => b.players - a.players);

  return (
    <main className="mx-auto flex w-full max-w-[1392px] flex-col gap-5 px-4 py-6 sm:px-8">
      <section className="hd-panel">
        <span className="hd-eyebrow">FOUNDATION PREVIEW</span>
        <h1 className="hd-panel__title">화면 준비 중</h1>
        <p className="text-sm text-muted">
          활성 전선 {fronts.length}곳 · 투입 인원{" "}
          {formatNumber(war?.totals.players ?? 0)}명 · 해방 행성{" "}
          {war?.totals.liberated ?? 0} / {war?.totals.planets ?? 0} · Steam
          동접자 최근 {players.length}개 슬롯
        </p>
      </section>

      <section className="hd-panel">
        <h2 className="hd-panel__title">주요 명령</h2>
        {orders.map((o) => (
          <div key={o.id} className="flex flex-col gap-1 text-sm">
            <p className="text-strong">{o.title}</p>
            <ul className="text-muted">
              {o.tasks.map((t, i) => (
                <li key={i}>
                  {t.text}
                  {t.ratio !== null && ` · ${formatPercent(t.ratio)}`}
                </li>
              ))}
            </ul>
            <p className="text-subtle">
              {o.rewards.join(", ")} · 만료 {formatKst(o.expiresAt)} KST
            </p>
          </div>
        ))}
      </section>

      <section className="hd-panel">
        <h2 className="hd-panel__title">활성 전선</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {fronts.slice(0, 8).map((f) => (
            <li key={f.index}>
              <PlanetName name={f.name} nameEn={f.nameEn} />{" "}
              <span className="text-subtle">
                · {factionOf(f.faction)?.name} · {formatPercent(f.progress)} ·{" "}
                {formatNumber(f.players)}명{f.defense && " · 방어"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="hd-panel">
        <h2 className="hd-panel__title">업데이트 내역</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {news.map((n) => (
            <li key={n.id}>
              <span className="font-mono text-info">
                {formatKst(n.publishedAt, true)}
              </span>{" "}
              {stripMarkup(n.title ?? n.body ?? "").slice(0, 60)}
              {n.original && <span className="text-subtle"> (원문)</span>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
