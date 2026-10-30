import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import { defenseProgress, liberation, ratePerHour } from "@/lib/hd/liberation";
import { isBuildPhase, LIFE } from "./cache";

const HOUR_MS = 3_600_000;
const HUMANS = 1;

export type Front = {
  index: number;
  name: string;
  nameEn: string;
  sector: string | null;
  position: { x: number; y: number };
  // Enemy holding the planet, or the attacker during a defense.
  faction: number;
  players: number;
  // 0..1: liberation, or defense progress while defending
  progress: number;
  // change of `progress` per hour over the last hour (F-01-5), null without history
  perHour: number | null;
  defense: { startedAt: string; expiresAt: string } | null;
  effectIds: number[];
};

export type WarOverview = {
  slot: string;
  // war season start, for "DAY N" in the page header
  warStartedAt: string | null;
  fronts: Front[];
  totals: { players: number; liberated: number; planets: number };
};

// Active fronts (planets with a campaign in the latest slot) and galaxy totals (F-01-1, F-01-3, F-01-4).
export async function getWarOverview(): Promise<WarOverview | null> {
  "use cache";
  cacheLife(LIFE);
  cacheTag("war");
  if (isBuildPhase()) return null;
  const db = getDb();
  const latest = await db.planetSnapshot.findFirst({
    orderBy: { slot: "desc" },
    select: { slot: true },
  });
  if (!latest) return null;
  const slot = latest.slot;
  const hourAgo = new Date(slot.getTime() - HOUR_MS);

  const [war, planets, now, before, campaigns, events, effects] =
    await Promise.all([
      db.war.findFirst({
        orderBy: { id: "desc" },
        select: { startedAt: true },
      }),
      db.planet.findMany({ where: { disabled: false } }),
      db.planetSnapshot.findMany({ where: { slot } }),
      db.planetSnapshot.findMany({ where: { slot: hourAgo } }),
      db.campaign.findMany({ where: { lastSeenAt: slot } }),
      db.planetEvent.findMany({
        where: { startedAt: { lte: slot }, expiresAt: { gt: slot } },
      }),
      db.planetEffect.findMany({ where: { endedAt: null } }),
    ]);
  const planetBy = new Map(planets.map((p) => [p.index, p]));
  const snapBy = new Map(now.map((s) => [s.planetIndex, s]));
  const prevBy = new Map(before.map((s) => [s.planetIndex, s]));
  const eventBy = new Map(events.map((e) => [e.planetIndex, e]));

  const progressOf = (
    s: (typeof now)[number],
    maxHealth: number,
    eventMax?: number,
  ) =>
    eventMax !== undefined
      ? defenseProgress(s.eventHealth ?? eventMax, eventMax)
      : liberation(s.health, maxHealth);

  const fronts = campaigns.flatMap((c): Front[] => {
    const p = planetBy.get(c.planetIndex);
    const s = snapBy.get(c.planetIndex);
    if (!p || !s) return [];
    const e = eventBy.get(c.planetIndex);
    const progress = progressOf(s, p.maxHealth, e?.maxHealth);
    const prev = prevBy.get(c.planetIndex);
    return [
      {
        index: p.index,
        name: p.nameKo ?? p.nameEn,
        nameEn: p.nameEn,
        sector: p.sector,
        position: { x: p.positionX, y: p.positionY },
        faction: e?.race ?? s.owner,
        players: s.players,
        progress,
        // A defense younger than an hour has no hour-old event health to compare with.
        perHour:
          prev && !(e && e.startedAt > hourAgo)
            ? ratePerHour(
                {
                  value: progressOf(prev, p.maxHealth, e?.maxHealth),
                  at: hourAgo,
                },
                { value: progress, at: slot },
              )
            : null,
        defense: e
          ? {
              startedAt: e.startedAt.toISOString(),
              expiresAt: e.expiresAt.toISOString(),
            }
          : null,
        effectIds: effects
          .filter((x) => x.planetIndex === p.index)
          .map((x) => x.effectId),
      },
    ];
  });

  return {
    slot: slot.toISOString(),
    warStartedAt: war?.startedAt.toISOString() ?? null,
    fronts,
    totals: {
      players: now.reduce((sum, s) => sum + s.players, 0),
      liberated: now.filter((s) => s.owner === HUMANS).length,
      planets: planets.length,
    },
  };
}
