import Link from "next/link";
import type { NewsEntry } from "@/lib/data/news";
import { formatKst } from "@/lib/hd/format";
import { kindLabel, newsPreview } from "@/lib/hd/news";

// Latest news, newest first (F-03-1, F-03-2, F-03-4). Text only: Steam HTML is never rendered.
export function UpdatesPanel({ news }: { news: NewsEntry[] }) {
  return (
    <section
      aria-labelledby="updates-title"
      className="hd-panel flex-[1_1_400px]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="updates-title" className="hd-panel__title">
          업데이트 내역
        </h2>
        <Link
          href="/news"
          className="font-mono text-xs text-subtle hover:text-strong focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
        >
          전체 보기 →
        </Link>
      </div>
      {news.length === 0 && (
        <p className="text-sm text-subtle">아직 수집된 소식이 없습니다.</p>
      )}
      <ul className="flex flex-col gap-3.5">
        {news.map((n) => {
          const { title, preview } = newsPreview(n);
          return (
            <li key={n.id} className="hd-update">
              <time dateTime={n.publishedAt} className="hd-update__date">
                {formatKst(n.publishedAt, true)}
              </time>
              <div className="min-w-0">
                <div className="hd-update__title wrap-anywhere">
                  {n.url ? (
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                    >
                      {title}
                    </a>
                  ) : (
                    title
                  )}
                </div>
                <div className="hd-update__desc line-clamp-2 wrap-anywhere">
                  <span className="font-mono">{kindLabel(n.kind)}</span>
                  {n.original && " · 원문"}
                  {n.originalText && " · 자동 번역"}
                  {preview && ` · ${preview}`}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
