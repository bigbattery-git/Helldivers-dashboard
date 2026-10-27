import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  assignmentsSchema,
  collectAssignments,
  collectNewsFeed,
  collectStatus,
  collectWarInfo,
  collectWarStats,
  diffEffects,
  dispatchText,
  newMirror,
  newsFeedSchema,
  planetEventSchema,
  staticPlanetsSchema,
  statusSchema,
  warInfoSchema,
  warStatsSchema,
} from "./arrowhead";
import assignment from "./__fixtures__/assignment.json";
import newsfeed from "./__fixtures__/newsfeed.json";
import planets from "./__fixtures__/planets.json";
import stats from "./__fixtures__/stats.json";
import status from "./__fixtures__/status.json";
import warinfo from "./__fixtures__/warinfo.json";
import { fetchJson, SourceError } from "./util";

vi.mock("./util", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./util")>()),
  fetchJson: vi.fn(),
}));

type Op = { op: string; args: Record<string, unknown> };

// Every Prisma call returns { op, args }, so a test reads the transaction it was given.
function fakeDb(found: Record<string, unknown[]> = {}) {
  const tx = vi.fn(async (ops: unknown[]) => ops);
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_, method) =>
          method === "findMany"
            ? async () => found[name] ?? []
            : (args: Record<string, unknown>) => ({
                op: `${name}.${String(method)}`,
                args,
              }),
      },
    );
  const db = new Proxy(
    { $transaction: tx },
    {
      get: (target, key) =>
        key === "$transaction" ? target.$transaction : model(String(key)),
    },
  );
  return {
    db: db as unknown as PrismaClient,
    ops: () => tx.mock.calls[0][0] as Op[],
  };
}

const ctxOf = (db: PrismaClient, offset: number | null = null) => ({
  db,
  now: new Date("2026-10-27T04:00:00Z"),
  slot: new Date("2026-10-27T04:00:00Z"),
  warId: 801,
  offset,
  mirror: newMirror(),
});

const isMirror = (url: string) => url.startsWith(MIRROR_URL);
const MIRROR_URL = "https://api.helldivers2.dev/raw/api";

afterEach(() => {
  vi.mocked(fetchJson).mockReset();
  vi.unstubAllEnvs();
});

describe("collectWarInfo", () => {
  const warInfoFetch =
    (names: () => unknown) =>
    async (url: string): Promise<{ data: unknown; date: Date }> => {
      if (url.endsWith("/WarID"))
        return { data: { id: 801 }, date: new Date() };
      if (url.endsWith("/WarInfo"))
        return { data: warInfoSchema.parse(warinfo), date: new Date() };
      return { data: names(), date: new Date() };
    };

  it("keeps the daily step due when static names fail", async () => {
    vi.mocked(fetchJson).mockImplementation(
      warInfoFetch(() => {
        throw new Error("names down");
      }) as typeof fetchJson,
    );
    const { db, ops } = fakeDb();
    await expect(collectWarInfo(db, new Date(), newMirror())).rejects.toThrow(
      "names down",
    );
    const war = ops()[0].args.update as { infoUpdatedAt: Date };
    expect(war.infoUpdatedAt).toEqual(new Date(0));
  });

  it("writes only new and changed planets, coordinates only on creation", async () => {
    vi.mocked(fetchJson).mockImplementation(
      warInfoFetch(() => ({})) as typeof fetchJson,
    );
    const stored = {
      nameEn: "Planet 0",
      nameKo: null,
      sector: null,
      maxHealth: 1000000,
      disabled: false,
      initialOwner: 1,
      // Moved by Status since: must not be reset to the WarInfo position.
      positionX: 0.5,
      positionY: 0.5,
    };
    const { db, ops } = fakeDb({
      planet: [
        { index: 0, ...stored },
        { index: 1, ...stored, nameEn: "Planet 1", maxHealth: 900000 },
      ],
    });

    const result = await collectWarInfo(db, new Date(), newMirror());

    expect(result).toMatchObject({ created: 1, updated: 1, changed: [1] });
    const [, create, update, ...rest] = ops();
    expect(rest).toEqual([]);
    expect(create).toMatchObject({
      op: "planet.createMany",
      args: { data: [{ index: 2, positionX: 0.04664221 }] },
    });
    expect(update.op).toBe("planet.update");
    expect(update.args.where).toEqual({ index: 1 });
    expect(update.args.data).not.toHaveProperty("positionX");
  });
});

describe("collectStatus", () => {
  // War time 85058100 at this real time gives offset 1_700_000_000.
  const date = new Date((85058100 + 1_700_000_000) * 1000);

  it("assembles one transaction for snapshots, moves, events and effects", async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      data: statusSchema.parse(status),
      date,
    });
    const { db, ops } = fakeDb({
      planet: [
        { index: 0, positionX: 0, positionY: 0 },
        { index: 1, positionX: 0.9, positionY: 0.9 },
      ],
      planetEffect: [
        { id: BigInt(1), planetIndex: 256, effectId: 1190 },
        { id: BigInt(2), planetIndex: 5, effectId: 9 },
      ],
    });
    const ctx = ctxOf(db);

    const result = await collectStatus(ctx);

    expect(ctx.offset).toBe(1_700_000_000);
    expect(result).toMatchObject({ count: 3, moved: [1], effectsEnded: 1 });
    expect(result).not.toHaveProperty("fallback");
    const list = ops();
    expect(list.map((o) => o.op)).toEqual([
      "war.update",
      "planetSnapshot.createMany",
      "planet.update",
      "campaign.createMany",
      "campaign.updateMany",
      "planetEvent.upsert",
      "planetEffect.createMany",
      "planetEffect.updateMany",
      "planetEffect.updateMany",
    ]);
    expect(list[0].args.data).toEqual({ timeOffsetSec: 1_700_000_000 });
    expect(list[2].args.where).toEqual({ index: 1 });
    expect(list[5].args.create).toMatchObject({
      id: 5001,
      startedAt: new Date((85054500 + 1_700_000_000) * 1000),
    });
    // The partial unique index turns a concurrent duplicate open into a no-op.
    expect(list[6].args.skipDuplicates).toBe(true);
    expect(list[7].args.where).toEqual({ id: { in: [BigInt(2)] } });
  });

  it("keeps the stored offset when Status comes from the mirror", async () => {
    vi.stubEnv("COMMUNITY_API_CONTACT", "me@example.com");
    vi.mocked(fetchJson).mockImplementation((async (url: string) => {
      if (!isMirror(url)) throw new Error("down");
      // Mirror snapshot ~28 s older than its Date header, as seen live.
      return {
        data: statusSchema.parse(status),
        date: new Date(date.getTime() + 28_000),
      };
    }) as typeof fetchJson);
    const { db, ops } = fakeDb();
    const ctx = ctxOf(db, 1_700_000_000);

    const result = await collectStatus(ctx);

    expect(ctx.offset).toBe(1_700_000_000);
    expect(result).toMatchObject({ fallback: true });
    expect(result).not.toHaveProperty("offsetRejected");
    expect(ops()[0].op).toBe("planetSnapshot.createMany");
  });

  it("keeps the stored offset when the new one jumps", async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      data: statusSchema.parse(status),
      date: new Date(date.getTime() + 600_000),
    });
    const { db, ops } = fakeDb();
    const ctx = ctxOf(db, 1_700_000_000);

    const result = await collectStatus(ctx);

    expect(ctx.offset).toBe(1_700_000_000);
    expect(result).toMatchObject({ offsetRejected: 1_700_000_600 });
    expect(ops()[0].op).toBe("planetSnapshot.createMany");
  });

  it("fails without any valid offset", async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      data: statusSchema.parse(status),
      date: new Date(NaN),
    });
    await expect(collectStatus(ctxOf(fakeDb().db))).rejects.toThrow(
      "offset invalid",
    );
  });
});

describe("community mirror fallback (D-03)", () => {
  const stats = { data: { galaxy_stats: {} }, date: new Date() };
  const down = new SourceError("HTTP 503 arrowhead", "http", { status: 503 });

  it("serves the same path from the mirror when Arrowhead fails", async () => {
    vi.stubEnv("COMMUNITY_API_CONTACT", "me@example.com");
    vi.mocked(fetchJson).mockImplementation((async (url: string) => {
      if (!isMirror(url)) throw down;
      return stats;
    }) as typeof fetchJson);

    const result = await collectWarStats(ctxOf(fakeDb().db));

    expect(result).toEqual({ fallback: true });
    const [url, , headers] = vi.mocked(fetchJson).mock.calls[1];
    expect(url).toBe(`${MIRROR_URL}/Stats/war/801/summary`);
    expect(headers).toMatchObject({
      "X-Super-Client": "helldivers-dashboard",
      "X-Super-Contact": "me@example.com",
    });
  });

  it("goes straight to the mirror once Arrowhead is down in this run", async () => {
    vi.stubEnv("COMMUNITY_API_CONTACT", "me@example.com");
    vi.mocked(fetchJson).mockImplementation((async (url: string) => {
      if (!isMirror(url)) throw down;
      return stats;
    }) as typeof fetchJson);
    const ctx = ctxOf(fakeDb().db);

    await collectWarStats(ctx);
    await collectWarStats(ctx);

    const urls = vi.mocked(fetchJson).mock.calls.map(([u]) => u);
    expect(urls.filter((u) => !isMirror(u))).toHaveLength(1);
  });

  it("reports both failures when the mirror fails too", async () => {
    vi.stubEnv("COMMUNITY_API_CONTACT", "me@example.com");
    vi.mocked(fetchJson).mockImplementation((async (url: string) => {
      throw isMirror(url) ? new Error("mirror down") : down;
    }) as typeof fetchJson);

    await expect(collectWarStats(ctxOf(fakeDb().db))).rejects.toThrow(
      /HTTP 503 arrowhead \(fallback: Error: mirror down\)/,
    );
  });

  it("stops falling back for the run after a 429", async () => {
    vi.stubEnv("COMMUNITY_API_CONTACT", "me@example.com");
    vi.mocked(fetchJson).mockImplementation((async (url: string) => {
      if (isMirror(url))
        throw new SourceError("HTTP 429", "http", { status: 429 });
      throw new SourceError("bad body", "validation");
    }) as typeof fetchJson);
    const ctx = ctxOf(fakeDb().db);

    await expect(collectWarStats(ctx)).rejects.toThrow("bad body");
    await expect(collectWarStats(ctx)).rejects.toThrow("bad body");

    expect(ctx.mirror.mirrorDown).toBe(true);
    const urls = vi.mocked(fetchJson).mock.calls.map(([u]) => u);
    expect(urls.filter(isMirror)).toHaveLength(1);
  });

  it("stops calling a hung mirror for the run", async () => {
    vi.stubEnv("COMMUNITY_API_CONTACT", "me@example.com");
    vi.mocked(fetchJson).mockImplementation((async () => {
      throw new DOMException("aborted due to timeout", "TimeoutError");
    }) as typeof fetchJson);
    const ctx = ctxOf(fakeDb().db);

    await expect(collectWarStats(ctx)).rejects.toThrow(
      "aborted due to timeout (fallback: TimeoutError: aborted due to timeout)",
    );
    await expect(collectWarStats(ctx)).rejects.toThrow(
      "aborted due to timeout",
    );

    expect(ctx.mirror.mirrorDown).toBe(true);
    const urls = vi.mocked(fetchJson).mock.calls.map(([u]) => u);
    expect(urls.filter(isMirror)).toHaveLength(1);
  });

  it("does not fall back without a contact", async () => {
    vi.stubEnv("COMMUNITY_API_CONTACT", "");
    vi.mocked(fetchJson).mockRejectedValue(down);

    await expect(collectWarStats(ctxOf(fakeDb().db))).rejects.toBe(down);
    expect(fetchJson).toHaveBeenCalledOnce();
  });
});

describe("fallback keeps Korean text", () => {
  it("updates assignment progress without its title and briefing", async () => {
    vi.stubEnv("COMMUNITY_API_CONTACT", "me@example.com");
    vi.mocked(fetchJson).mockImplementation((async (url: string) => {
      if (!isMirror(url)) throw new Error("down");
      return { data: assignmentsSchema.parse(assignment), date: new Date() };
    }) as typeof fetchJson);
    const { db, ops } = fakeDb();

    const result = await collectAssignments(ctxOf(db, 0));

    expect(result).toMatchObject({ fallback: true });
    const upsert = ops()[0].args;
    expect(upsert.create).toHaveProperty("title");
    expect(upsert.update).not.toHaveProperty("title");
    expect(upsert.update).not.toHaveProperty("briefing");
  });

  it("only adds new dispatches", async () => {
    vi.stubEnv("COMMUNITY_API_CONTACT", "me@example.com");
    vi.mocked(fetchJson).mockImplementation((async (url: string) => {
      if (!isMirror(url)) throw new Error("down");
      return { data: newsFeedSchema.parse(newsfeed), date: new Date() };
    }) as typeof fetchJson);
    const { db, ops } = fakeDb();

    await collectNewsFeed(ctxOf(db, NEWS_OFFSET));

    expect(ops()[0].args.update).toEqual({});
  });
});

// Puts "now" (2026-10-27T04:00Z) at war time 85058100, so the fixture is within the 7-day window.
const NEWS_OFFSET = 1_708_015_500;

describe("mirror NewsFeed shape", () => {
  it("accepts PascalCase keys and keeps only the last 7 days", async () => {
    vi.stubEnv("COMMUNITY_API_CONTACT", "me@example.com");
    const body = [
      { Id: 1, Published: 84975052, Type: 0, Message: "recent" },
      { Id: 2, Published: 2414563, Type: 0, Message: "two years old" },
    ];
    vi.mocked(fetchJson).mockImplementation((async (url: string) => {
      if (!isMirror(url)) throw new Error("down");
      return { data: newsFeedSchema.parse(body), date: new Date() };
    }) as typeof fetchJson);
    const { db, ops } = fakeDb();

    const result = await collectNewsFeed(ctxOf(db, NEWS_OFFSET));

    expect(result).toEqual({ count: 1, fallback: true });
    expect(ops()).toHaveLength(1);
    expect(ops()[0].args.create).toMatchObject({
      externalId: "1",
      bodyEn: "recent",
    });
  });
});

// Fixtures are trimmed real responses from 2026-10-26, except status.planetEvents (none were live; community OpenAPI shape).
describe("schemas accept real responses", () => {
  it.each([
    ["Status", statusSchema, status],
    ["WarInfo", warInfoSchema, warinfo],
    ["Assignment", assignmentsSchema, assignment],
    ["NewsFeed", newsFeedSchema, newsfeed],
    ["Stats summary", warStatsSchema, stats],
    ["static planets", staticPlanetsSchema, planets],
  ] as const)("%s", (_, schema, fixture) => {
    expect((schema as z.ZodType).safeParse(fixture).success).toBe(true);
  });

  it("defense events", () => {
    expect(
      z.array(planetEventSchema).safeParse(status.planetEvents).success,
    ).toBe(true);
  });

  it("static planets carry the ko-KO name", () => {
    expect(staticPlanetsSchema.parse(planets)["0"].names?.["ko-KO"]).toBe(
      "슈퍼지구",
    );
  });

  it("keeps assignment progress values above int4", () => {
    const [mo] = assignmentsSchema.parse(assignment);
    expect(mo.setting.tasks[0].values).toContain(3827587060);
  });
});

describe("diffEffects", () => {
  it("starts new effects and ends missing ones", () => {
    const open = [
      { id: BigInt(1), planetIndex: 7, effectId: 100 },
      { id: BigInt(2), planetIndex: 8, effectId: 200 },
    ];
    const { started, ended } = diffEffects(open, [
      { index: 7, galacticEffectId: 100 },
      { index: 9, galacticEffectId: 300 },
    ]);
    expect(started).toEqual([{ planetIndex: 9, effectId: 300 }]);
    expect(ended.map((e) => e.id)).toEqual([BigInt(2)]);
  });

  it("does not restart an effect that stays active", () => {
    const { started, ended } = diffEffects(
      [{ planetIndex: 7, effectId: 100 }],
      [{ index: 7, galacticEffectId: 100 }],
    );
    expect(started).toEqual([]);
    expect(ended).toEqual([]);
  });
});

describe("dispatchText", () => {
  it("routes untranslated dispatches to the English column", () => {
    const [ko, en] = newsFeedSchema.parse(newsfeed);
    expect(dispatchText(ko.message)).toEqual({ bodyKo: ko.message });
    expect(dispatchText(en.message)).toEqual({ bodyEn: en.message });
  });
});
