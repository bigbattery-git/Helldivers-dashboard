import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { fetchJson, hasHangul, SourceError, warTimeToDate } from "./util";

// Primary game data source (ADR 0001). Every call needs Accept-Language, Status errors without it.
const BASE = "https://api.live.prod.thehelldiversgame.com/api";
const EN = { "Accept-Language": "en-US" };
const KO = { "Accept-Language": "ko-KR" };
const STATIC_PLANETS_URL =
  "https://raw.githubusercontent.com/helldivers-2/json/master/planets/planets.json";
const WEEK_SEC = 7 * 24 * 60 * 60;
// Community mirror of the same paths (D-03, docs/research/game-api.md B). English only, 5 calls per 10 s per IP.
const MIRROR = "https://api.helldivers2.dev/raw/api";
// War time and real time move together, so a larger jump means a bad Date header or clock.
const OFFSET_DRIFT_SEC = 120;

// Fallback state for one collection run, shared by every Arrowhead call.
export type Mirror = { primaryDown: boolean; mirrorDown: boolean };
export const newMirror = (): Mirror => ({
  primaryDown: false,
  mirrorDown: false,
});

// Network errors, timeouts and 5xx repeat on every call to that host within a run.
const hostDown = (error: unknown) => {
  if (!(error instanceof SourceError)) return true;
  const status = error.extra?.status;
  return typeof status === "number" && status >= 500;
};

export type CollectContext = {
  db: PrismaClient;
  now: Date;
  slot: Date;
  warId: number;
  offset: number | null;
  mirror: Mirror;
};

// Arrowhead first, then the community mirror for this one path when it fails (HTTP, network, validation).
async function get<T>(
  mirror: Mirror,
  path: string,
  schema: z.ZodType<T>,
  headers: Record<string, string>,
) {
  const contact = process.env.COMMUNITY_API_CONTACT;
  const canFall = Boolean(contact) && !mirror.mirrorDown;
  let primaryError: unknown;
  // Skipping a host already down keeps the run inside its deadline (8 s per hung call).
  if (!(canFall && mirror.primaryDown)) {
    try {
      return {
        ...(await fetchJson(BASE + path, schema, headers)),
        fallback: false,
      };
    } catch (error) {
      if (!canFall) throw error;
      if (hostDown(error)) mirror.primaryDown = true;
      primaryError = error;
    }
  }
  try {
    const res = await fetchJson(MIRROR + path, schema, {
      ...headers,
      "X-Super-Client": "helldivers-dashboard",
      "X-Super-Contact": contact!,
    });
    return { ...res, fallback: true };
  } catch (error) {
    // 429: the 5-per-10-s bucket is empty, so no more mirror calls this run either.
    if (
      hostDown(error) ||
      (error instanceof SourceError && error.extra?.status === 429)
    )
      mirror.mirrorDown = true;
    const first =
      primaryError instanceof Error
        ? primaryError.message
        : "Arrowhead skipped, down earlier in this run";
    const message = `${first} (fallback: ${String(error)})`;
    // A new error: a TimeoutError's message is read-only. SourceError keeps its kind and extra for Sentry.
    throw primaryError instanceof SourceError
      ? new SourceError(message, primaryError.kind, primaryError.extra)
      : new Error(message, { cause: primaryError ?? error });
  }
}

// Marks the source result as served by the mirror (D-05).
const flag = (fallback: boolean) => (fallback ? { fallback: true } : {});

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

// The mirror serves NewsFeed with PascalCase keys (checked 2026-10-27); other paths match Arrowhead.
const mirrorDispatch = z
  .object({ Id: int, Published: int, Type: int, Message: z.string() })
  .transform((d) => ({
    id: d.Id,
    published: d.Published,
    type: d.Type,
    message: d.Message,
  }));

export const newsFeedSchema = z.array(
  z.union([
    z.object({ id: int, published: int, type: int, message: z.string() }),
    mirrorDispatch,
  ]),
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
export async function collectWarInfo(
  db: PrismaClient,
  now: Date,
  mirror: Mirror,
) {
  const warId = await get(mirror, "/WarSeason/current/WarID", warIdSchema, EN);
  const [infoRes, namesRes] = await Promise.allSettled([
    get(mirror, `/WarSeason/${warId.data.id}/WarInfo`, warInfoSchema, EN),
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
  const created: Prisma.PlanetCreateManyInput[] = [];
  const updates = info.planetInfos.flatMap((p) => {
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
    };
    const before = existing.get(p.index);
    // Coordinates only on creation: Status keeps the live position afterwards.
    if (!before) {
      created.push({
        index: p.index,
        ...nameData,
        ...data,
        positionX: p.position.x,
        positionY: p.position.y,
      });
      return [];
    }
    if (before.disabled !== p.disabled || before.maxHealth !== p.maxHealth)
      changed.push(p.index);
    const update = names ? { ...nameData, ...data } : data;
    const same = Object.entries(update).every(
      ([k, v]) => before[k as keyof typeof update] === v,
    );
    return same
      ? []
      : [db.planet.update({ where: { index: p.index }, data: update })];
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
    // skipDuplicates: a concurrent run may create the same planet first.
    db.planet.createMany({ data: created, skipDuplicates: true }),
    ...updates,
  ]);
  if (namesRes.status === "rejected") throw namesRes.reason;
  return {
    count: info.planetInfos.length,
    created: created.length,
    updated: updates.length,
    changed,
    ...flag(warId.fallback || infoRes.value.fallback),
  };
}

// Every slot: planet snapshots, positions, campaigns, defense events, effect intervals.
export async function collectStatus(ctx: CollectContext) {
  const { db, slot } = ctx;
  const {
    data: status,
    date,
    fallback,
  } = await get(ctx.mirror, `/WarSeason/${ctx.warId}/Status`, statusSchema, EN);
  const measured = Math.round(date.getTime() / 1000) - status.time;
  // shortcut: a real jump over 2 minutes is rejected forever, fix war.time_offset_sec by hand if it happens.
  const accepted =
    Number.isFinite(measured) &&
    (ctx.offset == null ||
      // Mirror snapshots trail its Date header by up to ~20 s, so a stored offset is kept.
      (!fallback && Math.abs(measured - ctx.offset) <= OFFSET_DRIFT_SEC));
  const offset = accepted ? measured : ctx.offset;
  if (offset == null)
    throw new Error(`war time offset invalid: ${measured}, none stored`);
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
    ...(accepted
      ? [
          db.war.update({
            where: { id: ctx.warId },
            data: { timeOffsetSec: offset },
          }),
        ]
      : []),
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
    ...(accepted || fallback ? {} : { offsetRejected: measured }),
    ...flag(fallback),
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
  const { data, date, fallback } = await get(
    ctx.mirror,
    `/v2/Assignment/War/${ctx.warId}`,
    assignmentsSchema,
    KO,
  );
  await ctx.db.$transaction([
    ...data.map((a) => {
      const text = {
        title: a.setting.overrideTitle,
        briefing: a.setting.overrideBrief,
      };
      const row = {
        tasks: a.setting.tasks,
        rewards: a.setting.rewards,
        startedAt: warTimeToDate(offset, a.startTime),
        expiresAt: new Date(date.getTime() + a.expiresIn * 1000),
        lastSeenAt: ctx.slot,
      };
      // The mirror is English only: keep the stored Korean text, refresh the rest.
      return ctx.db.assignment.upsert({
        where: { id: BigInt(a.id32) },
        create: { id: BigInt(a.id32), ...text, ...row },
        update: fallback ? row : { ...text, ...row },
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
  return { count: data.length, ...flag(fallback) };
}

// Dispatch text goes to the ko or en column by content, so a later translation fills ko.
export function dispatchText(message: string) {
  return hasHangul(message) ? { bodyKo: message } : { bodyEn: message };
}

// Every slot: last 7 days of dispatches, re-fetched to pick up late translations.
export async function collectNewsFeed(ctx: CollectContext) {
  const offset = requireOffset(ctx);
  const from = Math.floor(ctx.now.getTime() / 1000) - offset - WEEK_SEC;
  const { data, fallback } = await get(
    ctx.mirror,
    `/NewsFeed/${ctx.warId}?maxEntries=1024&fromTimestamp=${from}`,
    newsFeedSchema,
    KO,
  );
  // The mirror ignores the query and returns the whole history (~1,100 entries).
  const recent = data.filter((d) => d.published >= from);
  await ctx.db.$transaction(
    recent.map((d) => {
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
        // Mirror text is English: only add new dispatches, never replace a Korean body.
        update: fallback ? {} : text,
      });
    }),
  );
  return { count: recent.length, ...flag(fallback) };
}

// Hourly: galaxy-wide cumulative stats.
export async function collectWarStats(ctx: CollectContext) {
  const { data, fallback } = await get(
    ctx.mirror,
    `/Stats/war/${ctx.warId}/summary`,
    warStatsSchema,
    EN,
  );
  await ctx.db.warStatsSnapshot.createMany({
    data: [{ slot: ctx.slot, galaxyStats: data.galaxy_stats }],
    skipDuplicates: true,
  });
  return flag(fallback);
}
