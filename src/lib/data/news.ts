import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import { isBuildPhase, LIFE } from "./cache";

export type NewsEntry = {
  id: string;
  source: string;
  kind: string;
  title: string | null;
  body: string | null;
  // No Korean text yet: the screen marks it as "원문" (F-03-2).
  original: boolean;
  // English body behind a machine translation (ADR 0006).
  originalText: string | null;
  url: string | null;
  publishedAt: string;
};

// Unified feed, newest first (F-03-1). The news page filters it by kind in the browser (F-03-3).
export async function getNews(limit: number): Promise<NewsEntry[]> {
  "use cache";
  cacheLife(LIFE);
  cacheTag("news");
  if (isBuildPhase()) return [];
  const rows = await getDb().newsItem.findMany({
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
      originalText: r.translation === "machine" ? r.bodyEn : null,
      url: r.url,
      publishedAt: r.publishedAt.toISOString(),
    };
  });
}
