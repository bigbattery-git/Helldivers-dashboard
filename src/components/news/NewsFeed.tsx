"use client";

import { useState } from "react";
import { Markup } from "@/components/hud/Markup";
import { formatKst } from "@/lib/hd/format";
import { kindLabel } from "@/lib/hd/news";

export type FeedEntry = {
  id: string;
  kind: string;
  source: string;
  title: string;
  // dispatch: markup text; Steam: plain paragraphs (steamText). Never HTML.
  text: string;
  original: boolean;
  url: string | null;
  publishedAt: string;
};

const FILTERS = [
  { value: "all", label: "전체" },
  { value: "dispatch", label: "디스패치" },
  { value: "patch", label: "패치노트" },
  { value: "announcement", label: "공지" },
];

// News feed with a kind filter (F-03-1, F-03-3); each item opens to its full text (F-03-2, F-03-4).
// Filtering stays in the browser so the page keeps its cached static shell.
export function NewsFeed({ entries }: { entries: FeedEntry[] }) {
  const [kind, setKind] = useState("all");
  const list =
    kind === "all" ? entries : entries.filter((e) => e.kind === kind);
  return (
    <section aria-labelledby="feed-title" className="hd-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="feed-title" className="hd-panel__title">
          소식 {list.length}건
        </h2>
        <div role="group" aria-label="종류" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={kind === f.value}
              onClick={() => setKind(f.value)}
              className="min-h-[44px] border border-line px-3 font-mono text-xs text-subtle aria-pressed:border-muted aria-pressed:text-strong focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 && (
        <p className="text-sm text-subtle">이 종류의 소식이 아직 없습니다.</p>
      )}
      <ul className="flex flex-col gap-2">
        {list.map((e) => (
          <li key={e.id}>
            <details className="group bg-base">
              <summary className="flex cursor-pointer list-none gap-4 p-3 [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">
                <time
                  dateTime={e.publishedAt}
                  className="min-w-[44px] font-mono text-xs text-info"
                >
                  {formatKst(e.publishedAt, true)}
                </time>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium text-body">
                    {e.title}
                  </span>
                  <span className="font-mono text-[11px] text-subtle">
                    {kindLabel(e.kind)}
                    {e.original && " · 원문"} · {formatKst(e.publishedAt)} KST
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-subtle group-open:rotate-180"
                >
                  ▾
                </span>
              </summary>
              <div className="flex flex-col gap-3 border-t border-line px-3 pt-3 pb-4 pl-[76px] text-sm leading-6 text-muted">
                {e.source === "dispatch" ? (
                  <Markup text={e.text} />
                ) : (
                  <p className="whitespace-pre-line">{e.text}</p>
                )}
                {e.url && (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start font-mono text-xs text-subtle underline hover:text-strong focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                  >
                    원문 보기 ↗
                  </a>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
