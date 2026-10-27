import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import { isBuildPhase, LIFE } from "./cache";

const HOUR_MS = 3_600_000;

export type PlayerPoint = { slot: string; players: number };

// Steam concurrent players per 15-minute slot for the last `hours` (F-04-1).
// Hour buckets for 7d/30d are made by src/lib/hd/series.ts (F-04-5).
export async function getPlayerSeries(hours: number): Promise<PlayerPoint[]> {
  "use cache";
  cacheLife(LIFE);
  cacheTag("stats");
  if (isBuildPhase()) return [];
  const db = getDb();
  const last = await db.globalSnapshot.findFirst({ orderBy: { slot: "desc" } });
  if (!last) return [];
  const rows = await db.globalSnapshot.findMany({
    where: { slot: { gt: new Date(last.slot.getTime() - hours * HOUR_MS) } },
    orderBy: { slot: "asc" },
  });
  return rows.map((r) => ({
    slot: r.slot.toISOString(),
    players: r.steamPlayers,
  }));
}

export type OwnerPlayers = { slot: string; owner: number; players: number };

// Players per planet owner and slot for the last `hours`, for faction shares (F-04-3).
export async function getOwnerPlayers(hours: number): Promise<OwnerPlayers[]> {
  "use cache";
  cacheLife(LIFE);
  cacheTag("war");
  if (isBuildPhase()) return [];
  const db = getDb();
  const last = await db.planetSnapshot.findFirst({
    orderBy: { slot: "desc" },
    select: { slot: true },
  });
  if (!last) return [];
  const rows = await db.planetSnapshot.groupBy({
    by: ["slot", "owner"],
    where: { slot: { gt: new Date(last.slot.getTime() - hours * HOUR_MS) } },
    _sum: { players: true },
  });
  return rows.map((r) => ({
    slot: r.slot.toISOString(),
    owner: r.owner,
    players: r._sum.players ?? 0,
  }));
}

export type WarStatsPair = {
  latest: { slot: string; stats: Record<string, unknown> };
  before: { slot: string; stats: Record<string, unknown> };
};

// The newest war-stats snapshot and the one closest to a day earlier (F-04-4).
// Falls back to the oldest snapshot while less than a day has been collected.
export async function getWarStatsPair(): Promise<WarStatsPair | null> {
  "use cache";
  cacheLife(LIFE);
  cacheTag("stats");
  if (isBuildPhase()) return null;
  const db = getDb();
  const latest = await db.warStatsSnapshot.findFirst({
    orderBy: { slot: "desc" },
  });
  if (!latest) return null;
  const dayAgo = new Date(latest.slot.getTime() - 24 * HOUR_MS);
  const before =
    (await db.warStatsSnapshot.findFirst({
      where: { slot: { lte: dayAgo } },
      orderBy: { slot: "desc" },
    })) ?? (await db.warStatsSnapshot.findFirst({ orderBy: { slot: "asc" } }));
  if (!before || before.slot.getTime() === latest.slot.getTime()) return null;
  const pick = (s: typeof latest) => ({
    slot: s.slot.toISOString(),
    stats: s.galaxyStats as Record<string, unknown>,
  });
  return { latest: pick(latest), before: pick(before) };
}
