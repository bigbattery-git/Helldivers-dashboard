import * as Sentry from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { collectStatus, collectWarInfo, collectWarStats } from "./arrowhead";
import { DEADLINE_MS, runCollection } from "./run";
import { collectSteamNews } from "./steam";

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
