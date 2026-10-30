import * as Sentry from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  collectAssignments,
  collectNewsFeed,
  collectStatus,
  collectWarInfo,
  collectWarStats,
} from "./arrowhead";
import { DEADLINE_MS, runCollection } from "./run";
import { collectSteamNews } from "./steam";
import { translatePending } from "./translate";
import { checkDeletedX, collectX } from "./x";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));
vi.mock("./arrowhead", () => ({
  collectWarInfo: vi.fn(async () => ({})),
  collectStatus: vi.fn(async () => ({})),
  collectAssignments: vi.fn(async () => ({})),
  collectNewsFeed: vi.fn(async () => ({})),
  collectWarStats: vi.fn(async () => ({})),
  newMirror: () => ({ primaryDown: false, mirrorDown: false }),
}));
vi.mock("./steam", () => ({
  collectSteamPlayers: vi.fn(async () => ({})),
  collectSteamNews: vi.fn(async () => ({})),
}));
vi.mock("./x", () => ({
  collectX: vi.fn(async () => ({})),
  checkDeletedX: vi.fn(async () => ({})),
}));
vi.mock("./translate", () => ({
  TIMEOUT_MS: 15_000,
  translatePending: vi.fn(async () => ({})),
}));

const now = new Date("2026-10-27T04:00:00Z");

// Fresh war info and stats, so the daily and hourly steps are skipped.
function fakeDb(update = vi.fn(async () => ({}))) {
  const db = {
    collectionRun: {
      create: vi.fn(async () => ({ id: BigInt(1) })),
      update,
      findFirst: vi.fn(async (): Promise<{ results: unknown } | null> => ({
        results: { status: { status: "ok" } },
      })),
    },
    war: {
      findFirst: vi.fn(
        async (): Promise<{
          id: number;
          infoUpdatedAt: Date;
          timeOffsetSec: number;
        } | null> => ({ id: 801, infoUpdatedAt: now, timeOffsetSec: 0 }),
      ),
    },
    planet: { count: vi.fn(async () => 273) },
    warStatsSnapshot: {
      findFirst: vi.fn(async () => ({ slot: now })),
    },
  };
  return { db, client: db as unknown as PrismaClient };
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("optional sources (F-03-6, ADR 0006)", () => {
  it("skips X and translation without their keys", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    const { results } = await runCollection(fakeDb().client, now);
    expect(results.x).toEqual({ status: "skipped", reason: "no token" });
    expect(results.translate).toEqual({ status: "skipped", reason: "no key" });
    expect(collectX).not.toHaveBeenCalled();
    expect(translatePending).not.toHaveBeenCalled();
  });

  it("keeps the other sources and still translates when X fails", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "t");
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.mocked(collectX).mockRejectedValueOnce(new Error("HTTP 402"));
    const { results } = await runCollection(fakeDb().client, now);
    expect(results.x).toMatchObject({ status: "error" });
    expect(results.status).toMatchObject({ status: "ok" });
    expect(results.steamNews).toMatchObject({ status: "ok" });
    expect(results.translate).toMatchObject({ status: "ok" });
  });

  it("translates one item alone after a failed batch", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    const { db, client } = fakeDb();
    db.collectionRun.findFirst.mockResolvedValueOnce({
      results: { translate: { status: "error" } },
    });
    await runCollection(client, now);
    expect(translatePending).toHaveBeenCalledWith(client, now, true);
  });

  it("skips translation when the Gemini call would outlast the deadline", async () => {
    vi.useFakeTimers();
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.mocked(collectStatus).mockReturnValueOnce(
      new Promise((resolve) => setTimeout(() => resolve({} as never), 25_000)),
    );
    const done = runCollection(fakeDb().client, now);
    await vi.advanceTimersByTimeAsync(25_000);
    const { results } = await done;
    expect(results.translate).toEqual({ status: "skipped", reason: "no time" });
    expect(translatePending).not.toHaveBeenCalled();
  });

  it("checks X deletions once a day", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "t");
    const { db, client } = fakeDb();
    // previous run, then no deletion check in the last 24 hours
    db.collectionRun.findFirst
      .mockResolvedValueOnce({ results: {} })
      .mockResolvedValueOnce(null);
    expect((await runCollection(client, now)).results.xDeleted).toMatchObject({
      status: "ok",
    });
    expect(checkDeletedX).toHaveBeenCalledOnce();

    const again = await runCollection(client, now);
    expect(again.results.xDeleted).toEqual({ status: "skipped" });
    expect(checkDeletedX).toHaveBeenCalledOnce();
  });
});

describe("runCollection", () => {
  it("records a failing source and keeps the others (D-08)", async () => {
    vi.mocked(collectSteamNews).mockRejectedValueOnce(new Error("boom"));
    const { results } = await runCollection(fakeDb().client, now);
    expect(results.steamNews).toMatchObject({ status: "error" });
    expect(results.status).toMatchObject({ status: "ok" });
    expect(results.warInfo).toEqual({ status: "skipped" });
  });

  it("closes the run at the deadline when a source hangs", async () => {
    vi.useFakeTimers();
    vi.mocked(collectSteamNews).mockReturnValueOnce(new Promise(() => {}));
    const { db, client } = fakeDb();
    const done = runCollection(client, now);
    await vi.advanceTimersByTimeAsync(DEADLINE_MS);
    const { results } = await done;
    expect(results.deadline).toMatchObject({ status: "error" });
    expect(results.status).toMatchObject({ status: "ok" });
    expect(db.collectionRun.update).toHaveBeenCalledOnce();
    expect(Sentry.flush).toHaveBeenCalledOnce();
  });

  it("starts no step after the deadline closed the run", async () => {
    vi.useFakeTimers();
    vi.mocked(collectStatus).mockReturnValueOnce(
      new Promise((resolve) =>
        setTimeout(() => resolve({} as never), DEADLINE_MS + 5_000),
      ),
    );
    const done = runCollection(fakeDb().client, now);
    await vi.advanceTimersByTimeAsync(DEADLINE_MS);
    await done;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(collectAssignments).not.toHaveBeenCalled();
    expect(collectNewsFeed).not.toHaveBeenCalled();
  });

  it("rechecks the war after the last run's Status failed", async () => {
    const { db, client } = fakeDb();
    db.collectionRun.findFirst.mockResolvedValueOnce({
      results: { status: { status: "error" } },
    });
    const { results } = await runCollection(client, now);
    expect(collectWarInfo).toHaveBeenCalledOnce();
    expect(results.warInfo).toMatchObject({ status: "ok" });
  });

  it("skips the Arrowhead sources with a reason when no war is stored", async () => {
    const { db, client } = fakeDb();
    db.war.findFirst.mockResolvedValue(null);
    const { results } = await runCollection(client, now);
    for (const name of ["status", "assignment", "newsFeed", "warStats"])
      expect(results[name]).toEqual({
        status: "skipped",
        reason: "no war row",
      });
    expect(collectStatus).not.toHaveBeenCalled();
  });

  it("collects war stats again after an hour", async () => {
    const { db, client } = fakeDb();
    db.warStatsSnapshot.findFirst.mockResolvedValueOnce({
      slot: new Date(now.getTime() - 60 * 60_000),
    });
    const { results } = await runCollection(client, now);
    expect(collectWarStats).toHaveBeenCalledOnce();
    expect(results.warStats).toMatchObject({ status: "ok" });
  });

  it("skips war stats within the hour", async () => {
    const { results } = await runCollection(fakeDb().client, now);
    expect(results.warStats).toEqual({ status: "skipped" });
  });

  it("still flushes Sentry when closing the run fails", async () => {
    const update = vi.fn(async () => {
      throw new Error("db down");
    });
    await expect(runCollection(fakeDb(update).client, now)).rejects.toThrow(
      "db down",
    );
    expect(Sentry.flush).toHaveBeenCalledOnce();
  });
});
