import Link from "next/link";
import type { ReactNode } from "react";
import type { LastCollection } from "@/lib/data/collection";
import { formatKst } from "@/lib/hd/format";
import { StaleBadge } from "./StaleBadge";

// Compact header for pages below the dashboard (SRS v4 §9): back link, eyebrow, title,
// and the last collection time with the stale badge (F-05-1).
export function SubpageHeader({
  eyebrow,
  title,
  last,
}: {
  eyebrow: string;
  title: ReactNode;
  last: LastCollection | null;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="flex flex-col gap-2">
        <Link
          href="/"
          className="font-mono text-xs text-subtle hover:text-strong focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
        >
          ← 대시보드
        </Link>
        <span className="hd-eyebrow">{eyebrow}</span>
        <h1 className="font-display text-4xl font-bold text-strong">{title}</h1>
      </div>
      <div className="hd-stat">
        <div className="hd-stat__label">LAST UPDATE</div>
        <div className="hd-stat__value">
          {last ? formatKst(last.startedAt) : "—"}
        </div>
        <StaleBadge startedAt={last?.startedAt ?? null} />
      </div>
    </header>
  );
}
