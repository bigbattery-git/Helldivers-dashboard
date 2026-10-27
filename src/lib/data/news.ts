import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import { isBuildPhase, LIFE } from "./cache";

export type NewsKind = "dispatch" | "patch" | "announcement";

export type NewsEntry = {
  id: string;
  source: string;
  kind: string;
  title: string | null;
  body: string | null;
  // No Korean text yet: the screen marks it as "원문" (F-03-2).
  original: boolean;
  url: string | null;
  publishedAt: string;
};

// Unified feed, newest first (F-03-1); `kind` filters it (F-03-3).
export async function getNews(
  limit: number,
  kind?: NewsKind,
): Promise<NewsEntry[]> {
  "use cache";
  cacheLife(LIFE);
  cacheTag("news");
  if (isBuildPhase()) return [];
  const rows = await getDb().newsItem.findMany({
    where: kind ? { kind } : undefined,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  return rows.map((r) => {
    const ko = r.titleKo !== null || r.bodyKo !== null;
    return {
      id: r.id.toString(),
      source: r.source,
      kind: r.kind,
      title: ko ? r.titleKo : r.titleEn,
      body: ko ? r.bodyKo : r.bodyEn,
      original: !ko,
      url: r.url,
      publishedAt: r.publishedAt.toISOString(),
    };
  });
}
