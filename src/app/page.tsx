import { FrontCards } from "@/components/home/FrontCards";
import { GalaxyMap } from "@/components/home/GalaxyMap";
import { MajorOrderPanel } from "@/components/home/MajorOrderPanel";
import { PageHeader } from "@/components/home/PageHeader";
import { UpdatesPanel } from "@/components/home/UpdatesPanel";
import { getAssignments } from "@/lib/data/assignment";
import { getLastCollection } from "@/lib/data/collection";
import { getNews } from "@/lib/data/news";
import { getPlayerSeries } from "@/lib/data/stats";
import { getWarOverview } from "@/lib/data/war";
import { topFronts } from "@/lib/hd/fronts";

// Home dashboard in the confirmed design reference layout
// (docs/design-system/reference/dashboard.dc.html, SRS v4 §9):
// header + KPIs -> [galaxy map | major order] -> front cards -> updates
// (front cards replace the front list, SRS v5).
export default async function Home() {
  const [war, orders, news, players, last] = await Promise.all([
    getWarOverview(),
    getAssignments(),
    getNews(5),
    getPlayerSeries(24),
    getLastCollection(),
  ]);
  const fronts = war?.fronts ?? [];
  const moTargets = orders.flatMap((o) =>
    o.tasks.flatMap((t) => (t.planetIndex === null ? [] : [t.planetIndex])),
  );

  return (
    <main className="mx-auto flex w-full max-w-[1392px] flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader war={war} players={players} last={last} />
      <div className="flex flex-wrap gap-5">
        <GalaxyMap
          fronts={fronts}
          moTargets={moTargets}
          slot={war?.slot ?? null}
        />
        <MajorOrderPanel orders={orders} />
      </div>
      <FrontCards
        fronts={topFronts(fronts)}
        total={war?.totals.players ?? 0}
        slot={war?.slot ?? null}
        moTargets={moTargets}
      />
      <div className="flex flex-wrap gap-5">
        <UpdatesPanel news={news} />
      </div>
    </main>
  );
}
