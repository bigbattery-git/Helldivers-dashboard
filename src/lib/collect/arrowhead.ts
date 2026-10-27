import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { fetchJson, hasHangul, SourceError, warTimeToDate } from "./util";

// Primary game data source (ADR 0001). Every call needs Accept-Language, Status errors without it.
const BASE = "https://api.live.prod.thehelldiversgame.com/api";
const EN = { "Accept-Language": "en-US" };
const KO = { "Accept-Language": "ko-KR" };
const STATIC_PLANETS_URL =
  "https://raw.githubusercontent.com/helldivers-2/json/master/planets/planets.json";
const WEEK_SEC = 7 * 24 * 60 * 60;

export type CollectContext = {
  db: PrismaClient;
  now: Date;
  slot: Date;
  warId: number;
  offset: number | null;
};

const int = z.number().int();
const position = z.object({ x: z.number(), y: z.number() });

export const warIdSchema = z.object({ id: int });

export const warInfoSchema = z.object({
  warId: int,
  startDate: int,
  endDate: int,
  planetInfos: z.array(
    z.object({
      index: int,
      position,
      maxHealth: int,
      disabled: z.boolean(),
      initialOwner: int,
    }),
  ),
});

export const staticPlanetsSchema = z.record(
  z.string(),
  z.object({
    name: z.string(),
    sector: z.string().nullish(),
    names: z.record(z.string(), z.string()).optional(),
  }),
);

export const statusSchema = z.object({
  time: int,
  planetStatus: z.array(
    z.object({
      index: int,
      owner: int,
      health: int,
      regenPerSecond: z.number(),
      players: int,
      position,
    }),
  ),
  campaigns: z.array(
    z.object({ id: int, planetIndex: int, type: int, count: int, race: int }),
  ),
  // Parsed separately: its shape is unverified, and a bad event must not drop the snapshot.
  planetEvents: z.array(z.unknown()),
  planetActiveEffects: z.array(z.object({ index: int, galacticEffectId: int })),
});

// Community OpenAPI shape; no live event existed on 2026-10-26 to confirm it.
export const planetEventSchema = z.object({
  id: int,
  planetIndex: int,
  eventType: int,
  race: int,
  health: int,
  maxHealth: int,
  startTime: int,
  expireTime: int,
  campaignId: int,
});

export const assignmentsSchema = z.array(
  z.object({
    id32: int,
    startTime: int,
    progress: z.array(z.number()),
    expiresIn: z.number(),
    setting: z.object({
      overrideTitle: z.string(),
      overrideBrief: z.string(),
      tasks: z.array(
        z.object({
          type: int,
          values: z.array(z.number()),
          valueTypes: z.array(int),
        }),
      ),
      rewards: z
        .array(z.object({ type: int, id32: int, amount: z.number() }))
        .default([]),
    }),
  }),
);

export const newsFeedSchema = z.array(
  z.object({ id: int, published: int, type: int, message: z.string() }),
);

export const warStatsSchema = z.object({
  galaxy_stats: z.record(z.string(), z.number()),
});

type EffectKey = { planetIndex: number; effectId: number };

// Which effect intervals start and which end, comparing open intervals with the current Status.
export function diffEffects<T extends EffectKey>(
  open: T[],
  current: { index: number; galacticEffectId: number }[],
) {
  const key = (p: number, e: number) => `${p}:${e}`;
  const now = new Set(current.map((c) => key(c.index, c.galacticEffectId)));
  const before = new Set(open.map((o) => key(o.planetIndex, o.effectId)));
  return {
    started: current
      .filter((c) => !before.has(key(c.index, c.galacticEffectId)))
      .map((c) => ({ planetIndex: c.index, effectId: c.galacticEffectId })),
    ended: open.filter((o) => !now.has(key(o.planetIndex, o.effectId))),
  };
}

// Daily: war season, WarInfo and static planet names → `war`, `planet` (SRS v3 D-02, D-09).
export async function collectWarInfo(db: PrismaClient, now: Date) {
  const { data: warId } = await fetchJson(
    `${BASE}/WarSeason/current/WarID`,
    warIdSchema,
    EN,
  );
  const [infoRes, namesRes] = await Promise.allSettled([
    fetchJson(`${BASE}/WarSeason/${warId.id}/WarInfo`, warInfoSchema, EN),
    fetchJson(STATIC_PLANETS_URL, staticPlanetsSchema),
  ]);
  if (infoRes.status === "rejected") throw infoRes.reason;
  const info = infoRes.value.data;
  // Static names are optional here: without them WarInfo is still saved and existing names are kept.
  const names = namesRes.status === "fulfilled" ? namesRes.value.data : null;

  const existing = new Map(
    (await db.planet.findMany()).map((p) => [p.index, p]),
  );
  const changed: number[] = [];
  const upserts = info.planetInfos.map((p) => {
    const before = existing.get(p.index);
    if (
      before &&
      (before.disabled !== p.disabled || before.maxHealth !== p.maxHealth)
    )
      changed.push(p.index);
    const meta = names?.[String(p.index)];
    const nameData = {
      nameEn: meta?.name ?? `Planet ${p.index}`,
      nameKo: meta?.names?.["ko-KO"] ?? null,
      sector: meta?.sector ?? null,
    };
    const data = {
      maxHealth: p.maxHealth,
      disabled: p.disabled,
      initialOwner: p.initialOwner,
      positionX: p.position.x,
      positionY: p.position.y,
    };
    return db.planet.upsert({
      where: { index: p.index },
      create: { index: p.index, ...nameData, ...data },
      update: names ? { ...nameData, ...data } : data,
    });
  });

  const war = {
    startedAt: new Date(info.startDate * 1000),
    endedAt: new Date(info.endDate * 1000),
    // Without static names, leave the daily step due so the next slot retries them.
    infoUpdatedAt: names ? now : new Date(0),
  };
  await db.$transaction([
    db.war.upsert({
      where: { id: info.warId },
      create: { id: info.warId, ...war },
      update: war,
    }),
    ...upserts,
  ]);
  if (namesRes.status === "rejected") throw namesRes.reason;
  return { count: upserts.length, changed };
}

// Every slot: planet snapshots, positions, campaigns, defense events, effect intervals.
export async function collectStatus(ctx: CollectContext) {
  const { db, slot } = ctx;
  const { data: status, date } = await fetchJson(
    `${BASE}/WarSeason/${ctx.warId}/Status`,
    statusSchema,
    EN,
  );
  const offset = Math.round(date.getTime() / 1000) - status.time;
  ctx.offset = offset;

  const events = z.array(planetEventSchema).safeParse(status.planetEvents);
  const eventHealth = new Map(
    events.success ? events.data.map((e) => [e.planetIndex, e.health]) : [],
  );

  const planets = new Map(
    (
      await db.planet.findMany({
        select: { index: true, positionX: true, positionY: true },
      })
    ).map((p) => [p.index, p]),
  );
  const moved = status.planetStatus.filter((s) => {
    const p = planets.get(s.index);
    return p && (p.positionX !== s.position.x || p.positionY !== s.position.y);
  });

  const open = await db.planetEffect.findMany({ where: { endedAt: null } });
  const { started, ended } = diffEffects(open, status.planetActiveEffects);
  const endedIds = new Set(ended.map((e) => e.id));

  await db.$transaction([
    db.war.update({
      where: { id: ctx.warId },
      data: { timeOffsetSec: offset },
    }),
    db.planetSnapshot.createMany({
      data: status.planetStatus.map((s) => ({
        planetIndex: s.index,
        slot,
        owner: s.owner,
        health: s.health,
        regenPerSecond: s.regenPerSecond,
        players: s.players,
        eventHealth: eventHealth.get(s.index) ?? null,
      })),
      skipDuplicates: true,
    }),
    ...moved.map((s) =>
      db.planet.update({
        where: { index: s.index },
        data: { positionX: s.position.x, positionY: s.position.y },
      }),
    ),
    db.campaign.createMany({
      data: status.campaigns.map((c) => ({
        id: c.id,
        planetIndex: c.planetIndex,
        type: c.type,
        race: c.race,
        count: c.count,
        firstSeenAt: slot,
        lastSeenAt: slot,
      })),
      skipDuplicates: true,
    }),
    db.campaign.updateMany({
      where: { id: { in: status.campaigns.map((c) => c.id) } },
      data: { lastSeenAt: slot },
    }),
    ...(events.success ? events.data : []).map((e) => {
      const data = {
        planetIndex: e.planetIndex,
        eventType: e.eventType,
        race: e.race,
        startedAt: warTimeToDate(offset, e.startTime),
        expiresAt: warTimeToDate(offset, e.expireTime),
        maxHealth: e.maxHealth,
        campaignId: e.campaignId,
      };
      return db.planetEvent.upsert({
        where: { id: e.id },
        create: { id: e.id, ...data },
        update: data,
      });
    }),
    db.planetEffect.createMany({
      data: started.map((s) => ({ ...s, startedAt: slot, lastSeenAt: slot })),
      skipDuplicates: true,
    }),
    db.planetEffect.updateMany({
      where: { id: { in: [...endedIds] } },
      data: { endedAt: slot },
    }),
    db.planetEffect.updateMany({
      where: { endedAt: null },
      data: { lastSeenAt: slot },
    }),
  ]);

  // Everything else is saved; still surface the bad event payload.
  if (!events.success)
    throw new SourceError("planetEvents validation failed", "validation", {
      issues: events.error.issues.slice(0, 20),
      body: JSON.stringify(status.planetEvents).slice(0, 2048),
    });

  return {
    count: status.planetStatus.length,
    moved: moved.map((s) => s.index),
    effectsStarted: started.length,
    effectsEnded: ended.length,
  };
}

function requireOffset(ctx: CollectContext) {
  if (ctx.offset == null)
    throw new Error("war time offset unknown: Status has never succeeded");
  return ctx.offset;
}

// Every slot: major orders in ko-KR (SRS v3 D-12).
export async function collectAssignments(ctx: CollectContext) {
  const offset = requireOffset(ctx);
  const { data, date } = await fetchJson(
    `${BASE}/v2/Assignment/War/${ctx.warId}`,
    assignmentsSchema,
    KO,
  );
  await ctx.db.$transaction([
    ...data.map((a) => {
      const row = {
        title: a.setting.overrideTitle,
        briefing: a.setting.overrideBrief,
        tasks: a.setting.tasks,
        rewards: a.setting.rewards,
        startedAt: warTimeToDate(offset, a.startTime),
        expiresAt: new Date(date.getTime() + a.expiresIn * 1000),
        lastSeenAt: ctx.slot,
      };
      return ctx.db.assignment.upsert({
        where: { id: BigInt(a.id32) },
        create: { id: BigInt(a.id32), ...row },
        update: row,
      });
    }),
    ctx.db.assignmentSnapshot.createMany({
      data: data.map((a) => ({
        assignmentId: BigInt(a.id32),
        slot: ctx.slot,
        progress: a.progress,
      })),
      skipDuplicates: true,
    }),
  ]);
  return { count: data.length };
}

// Dispatch text goes to the ko or en column by content, so a later translation fills ko.
export function dispatchText(message: string) {
  return hasHangul(message) ? { bodyKo: message } : { bodyEn: message };
}

// Every slot: last 7 days of dispatches, re-fetched to pick up late translations.
export async function collectNewsFeed(ctx: CollectContext) {
  const offset = requireOffset(ctx);
  const from = Math.floor(ctx.now.getTime() / 1000) - offset - WEEK_SEC;
  const { data } = await fetchJson(
    `${BASE}/NewsFeed/${ctx.warId}?maxEntries=1024&fromTimestamp=${from}`,
    newsFeedSchema,
    KO,
  );
  await ctx.db.$transaction(
    data.map((d) => {
      const where = {
        source_externalId: { source: "dispatch", externalId: String(d.id) },
      };
      const text = dispatchText(d.message);
      return ctx.db.newsItem.upsert({
        where,
        create: {
          ...where.source_externalId,
          kind: "dispatch",
          publishedAt: warTimeToDate(offset, d.published),
          ...text,
        },
        update: text,
      });
    }),
  );
  return { count: data.length };
}

// Hourly: galaxy-wide cumulative stats.
export async function collectWarStats(ctx: CollectContext) {
  const { data } = await fetchJson(
    `${BASE}/Stats/war/${ctx.warId}/summary`,
    warStatsSchema,
    EN,
  );
  await ctx.db.warStatsSnapshot.createMany({
    data: [{ slot: ctx.slot, galaxyStats: data.galaxy_stats }],
    skipDuplicates: true,
  });
  return {};
}
