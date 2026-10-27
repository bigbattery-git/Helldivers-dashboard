import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import { liberation } from "@/lib/hd/liberation";
import type { Point } from "@/lib/hd/series";
import { isBuildPhase, LIFE } from "./cache";
import { type Front, getWarOverview } from "./war";

const DAY_MS = 86_400_000;
const HUMANS = 1;

export type PlanetDetail = {
  index: number;
  name: string;
  nameEn: string;
  sector: string | null;
  owner: number;
  // Present while the planet is an active front (same shape as the map tooltip).
  front: Front | null;
  effectIds: number[];
  series: { liberation: Point[]; players: Point[] };
};

// One planet with its last 30 days (F-04-2). null for an unknown index.
export async function getPlanetDetail(
  index: number,
): Promise<PlanetDetail | null> {
  "use cache";
  cacheLife(LIFE);
  cacheTag("war");
  if (isBuildPhase()) return null;
  const db = getDb();
  const planet = await db.planet.findUnique({ where: { index } });
  if (!planet) return null;
  const [war, last] = await Promise.all([
    getWarOverview(),
    db.planetSnapshot.findFirst({
      orderBy: { slot: "desc" },
      select: { slot: true },
    }),
  ]);
  const [snaps, effects] = await Promise.all([
    last
      ? db.planetSnapshot.findMany({
          where: {
            planetIndex: index,
            slot: { gt: new Date(last.slot.getTime() - 30 * DAY_MS) },
          },
          orderBy: { slot: "asc" },
        })
      : [],
    db.planetEffect.findMany({ where: { planetIndex: index, endedAt: null } }),
  ]);
  const front = war?.fronts.find((f) => f.index === index) ?? null;
  return {
    index,
    name: planet.nameKo ?? planet.nameEn,
    nameEn: planet.nameEn,
    sector: planet.sector,
    owner: snaps.at(-1)?.owner ?? planet.initialOwner,
    front,
    effectIds: effects.map((e) => e.effectId),
    series: {
      // Human-held means liberated; the defense HP pool is not part of this line.
      liberation: snaps.map((s) => ({
        at: s.slot.toISOString(),
        value: s.owner === HUMANS ? 1 : liberation(s.health, planet.maxHealth),
      })),
      players: snaps.map((s) => ({
        at: s.slot.toISOString(),
        value: s.players,
      })),
    },
  };
}
