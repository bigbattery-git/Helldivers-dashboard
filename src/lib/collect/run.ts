import * as Sentry from "@sentry/nextjs";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  collectAssignments,
  collectNewsFeed,
  collectStatus,
  collectWarInfo,
  collectWarStats,
  newMirror,
  type CollectContext,
} from "./arrowhead";
import { collectSteamNews, collectSteamPlayers } from "./steam";
import { translatePending } from "./translate";
import { slotOf, SourceError } from "./util";
import { checkDeletedX, collectX } from "./x";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
// Leaves room for the closing update (query_timeout 10s) and Sentry flush (2s) inside maxDuration 60s.
export const DEADLINE_MS = 40_000;

type SourceResult =
  | ({ status: "ok"; ms: number } & Prisma.InputJsonObject)
  | { status: "error"; ms?: number; kind?: string; error: string }
  | { status: "skipped"; reason?: string };

// One collection pass (SRS v3 §5). Each source is isolated: a failure is recorded and the rest continue (D-08).
export async function runCollection(db: PrismaClient, now = new Date()) {
  const run = await db.collectionRun.create({ data: { startedAt: now } });
  const slot = slotOf(now);
  const results: Record<string, SourceResult> = {};

  const fail = (name: string, error: unknown, ms?: number) => {
    const source = error instanceof SourceError ? error : undefined;
    results[name] = {
      status: "error",
      ms,
      kind: source?.kind,
      error: String(error).slice(0, 200),
    };
    Sentry.captureException(error, {
      tags: { source: name },
      extra: source?.extra,
    });
  };

  const step = async (
    name: string,
    fn: () => Promise<Prisma.InputJsonObject>,
  ) => {
    const start = performance.now();
    const ms = () => Math.round(performance.now() - start);
    try {
      results[name] = { status: "ok", ...(await fn()), ms: ms() };
    } catch (error) {
      fail(name, error, ms());
    }
  };

  // Arrowhead calls stay sequential (one host); Steam runs alongside so a hanging host cannot starve it.
  const arrowhead = async () => {
    const mirror = newMirror();
    const previous = await db.collectionRun.findFirst({
      where: { finishedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      select: { results: true },
    });
    // A failed Status may mean a new war season, so the WarID is checked again.
    const statusFailed =
      (previous?.results as Record<string, SourceResult> | null)?.status
        ?.status === "error";
    // Daily refresh decided from DB state, so a missed slot or the first run still triggers it (D-02).
    let war = await db.war.findFirst({ orderBy: { id: "desc" } });
    if (
      !war ||
      statusFailed ||
      now.getTime() - war.infoUpdatedAt.getTime() > DAY_MS ||
      (await db.planet.count()) === 0
    ) {
      await step("warInfo", () => collectWarInfo(db, now, mirror));
      war = await db.war.findFirst({ orderBy: { id: "desc" } });
    } else results.warInfo = { status: "skipped" };
    if (!war) {
      for (const name of ["status", "assignment", "newsFeed", "warStats"])
        results[name] = { status: "skipped", reason: "no war row" };
      return;
    }

    const ctx: CollectContext = {
      db,
      now,
      slot,
      warId: war.id,
      offset: war.timeOffsetSec,
      mirror,
    };
    await step("status", () => collectStatus(ctx));
    await step("assignment", () => collectAssignments(ctx));
    await step("newsFeed", () => collectNewsFeed(ctx));

    const lastStats = await db.warStatsSnapshot.findFirst({
      orderBy: { slot: "desc" },
    });
    if (!lastStats || slot.getTime() - lastStats.slot.getTime() >= HOUR_MS)
      await step("warStats", () => collectWarStats(ctx));
    else results.warStats = { status: "skipped" };
  };

  // X is optional and billed (ADR 0002): without a token the feed simply has no X items (F-03-6).
  const x = async () => {
    if (!process.env.X_BEARER_TOKEN) {
      results.x = { status: "skipped", reason: "no token" };
      return;
    }
    await step("x", () => collectX(db));
    const checkedToday = await db.collectionRun.findFirst({
      where: {
        startedAt: { gt: new Date(now.getTime() - DAY_MS) },
        results: { path: ["xDeleted", "status"], equals: "ok" },
      },
      select: { id: true },
    });
    if (checkedToday) results.xDeleted = { status: "skipped" };
    else await step("xDeleted", () => checkDeletedX(db, now));
  };

  // After Arrowhead and X, so this run's new English text is translated right away (ADR 0006).
  const translate = async () => {
    if (!process.env.GEMINI_API_KEY)
      results.translate = { status: "skipped", reason: "no key" };
    else await step("translate", () => translatePending(db, now));
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  // A hung source must not run into maxDuration, where the platform kills us before `finally`.
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      fail("deadline", new Error(`collection exceeded ${DEADLINE_MS}ms`));
      resolve();
    }, DEADLINE_MS);
  });
  try {
    await Promise.race([
      Promise.all([
        // Steps record their own failures; this only catches the DB reads between them.
        Promise.all([
          arrowhead().catch((error) => fail("arrowhead", error)),
          x().catch((error) => fail("x", error)),
        ]).then(translate),
        step("steamPlayers", () => collectSteamPlayers(db, slot)),
        step("steamNews", () => collectSteamNews(db)),
      ]),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
    try {
      // Always close the run, so a crash still leaves which sources finished (D-05).
      await db.collectionRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), results },
      });
    } finally {
      // Serverless may freeze right after the response; send queued Sentry events first (ADR 0005).
      await Sentry.flush(2000);
    }
  }
  return { slot, results };
}
