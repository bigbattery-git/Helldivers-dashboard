import type { Metadata } from "next";
import { SubpageHeader } from "@/components/hud/SubpageHeader";
import { type FeedEntry, NewsFeed } from "@/components/news/NewsFeed";
import { getLastCollection } from "@/lib/data/collection";
import { getNews } from "@/lib/data/news";
import { newsPreview, steamText } from "@/lib/hd/news";
import { stripMarkup } from "@/lib/hd/markup";

export const metadata: Metadata = { title: "뉴스 · Helldivers Dashboard" };

// Unified news feed (SRS v2 F-03): dispatches and Steam posts, newest first.
export default async function NewsPage() {
  const [news, last] = await Promise.all([getNews(50), getLastCollection()]);
  const entries: FeedEntry[] = news.map((n) => {
    const { title } = newsPreview(n);
    const body = n.body ?? "";
    return {
      id: n.id,
      kind: n.kind,
      source: n.source,
      title,
      // Dispatch headlines already serve as the title; drop them from the body.
      text:
        n.source === "dispatch"
          ? body.replace(/^\s*<i=3>[^<]*<\/i>\s*/, "") || stripMarkup(body)
          : n.source === "x"
            ? body
            : steamText(body),
      original: n.original,
      originalText: n.originalText,
      url: n.url,
      publishedAt: n.publishedAt,
    };
  });
  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
      <SubpageHeader eyebrow="NEWS" title="뉴스·패치노트" last={last} />
      <NewsFeed entries={entries} />
    </main>
  );
}
