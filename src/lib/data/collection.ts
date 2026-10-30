import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import { isBuildPhase, LIFE } from "./cache";

export type LastCollection = {
  // ISO strings: they cross into client components (stale badge).
  startedAt: string;
  // Start of the last run whose Status (war state) succeeded; the stale badge counts from it (F-05-1).
  dataAt: string | null;
  // Sources that failed in that run, for the header status (F-05-1).
  failed: string[];
  // Sources served by the community mirror in that run (F-05-2).
  fallback: string[];
};

// Last finished collection run (F-05-1, D-05).
export async function getLastCollection(): Promise<LastCollection | null> {
  "use cache";
  cacheLife(LIFE);
  cacheTag("collection");
  if (isBuildPhase()) return null;
  const run = await getDb().collectionRun.findFirst({
    where: { finishedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true, results: true },
  });
  if (!run) return null;
  const results = run.results as Record<
    string,
    { status?: string; fallback?: boolean }
  >;
  const keys = Object.keys(results);
  // Runs keep finishing while Arrowhead and the mirror fail, so the run time alone hides old data.
  const dataRun =
    results.status?.status === "ok"
      ? run
      : await getDb().collectionRun.findFirst({
          where: { results: { path: ["status", "status"], equals: "ok" } },
          orderBy: { startedAt: "desc" },
          select: { startedAt: true },
        });
  return {
    startedAt: run.startedAt.toISOString(),
    dataAt: dataRun?.startedAt.toISOString() ?? null,
    failed: keys.filter((k) => results[k]?.status === "error"),
    fallback: keys.filter((k) => results[k]?.fallback === true),
  };
}
