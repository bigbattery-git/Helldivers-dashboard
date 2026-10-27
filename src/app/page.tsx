import { FrontList } from "@/components/home/FrontList";
import { KpiTiles } from "@/components/home/KpiTiles";
import { MajorOrderPanel } from "@/components/home/MajorOrderPanel";
import { UpdatesPanel } from "@/components/home/UpdatesPanel";
import { getAssignments } from "@/lib/data/assignment";
import { getNews } from "@/lib/data/news";
import { getPlayerSeries } from "@/lib/data/stats";
import { getWarOverview } from "@/lib/data/war";

// Home dashboard (SRS v2 §3, design system README "화면 구성").
// The galaxy map joins the major-order row in PR B2.
export default async function Home() {
  const [war, orders, news, players] = await Promise.all([
    getWarOverview(),
    getAssignments(),
    getNews(5),
    getPlayerSeries(24),
  ]);
  const moTargets = orders.flatMap((o) =>
    o.tasks.flatMap((t) => (t.planetIndex === null ? [] : [t.planetIndex])),
  );

  return (
    <main className="mx-auto flex w-full max-w-[1392px] flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-col gap-4">
        <div>
          <span className="hd-eyebrow">GALACTIC WAR</span>
          <h1 className="font-display text-4xl font-bold text-strong">
            은하 전쟁 현황
          </h1>
        </div>
        <KpiTiles totals={war?.totals} players={players} />
      </header>

      <div className="flex flex-wrap gap-5">
        <MajorOrderPanel orders={orders} />
      </div>

      <div className="flex flex-wrap gap-5">
        <FrontList fronts={war?.fronts ?? []} moTargets={moTargets} />
        <UpdatesPanel news={news} />
      </div>
    </main>
  );
}
