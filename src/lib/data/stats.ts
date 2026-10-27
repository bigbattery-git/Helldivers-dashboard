import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import { isBuildPhase, LIFE } from "./cache";

export type PlayerPoint = { slot: string; players: number };

// Steam concurrent players per 15-minute slot for the last `hours` (F-04-1).
// shortcut: raw slots only; hour buckets for 7d/30d come with the stats page (F-04-5, PR C).
export async function getPlayerSeries(hours: number): Promise<PlayerPoint[]> {
  "use cache";
  cacheLife(LIFE);
  cacheTag("stats");
  if (isBuildPhase()) return [];
  const db = getDb();
  const last = await db.globalSnapshot.findFirst({ orderBy: { slot: "desc" } });
  if (!last) return [];
  const rows = await db.globalSnapshot.findMany({
    where: { slot: { gt: new Date(last.slot.getTime() - hours * 3_600_000) } },
    orderBy: { slot: "asc" },
  });
  return rows.map((r) => ({
    slot: r.slot.toISOString(),
    players: r.steamPlayers,
  }));
}
