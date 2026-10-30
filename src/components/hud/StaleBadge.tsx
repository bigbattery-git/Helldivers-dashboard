"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { LastCollection } from "@/lib/data/collection";
import { behind } from "@/lib/hd/refresh";

const STALE_MS = 30 * 60_000;

// The cached page is frozen at render time, so the delay is judged in the browser (F-05-1).
// The same minute check pulls the new render once a collection should have landed (SRS v6):
// the first refresh after a collection can still get the old payload, so it retries every minute.
// Delay counts from the last war-state data (`dataAt`), the refresh from the last run (`startedAt`).
export function StaleBadge({ last }: { last: LastCollection | null }) {
  const router = useRouter();
  const [stale, setStale] = useState(false);
  const startedAt = last?.startedAt ?? null;
  const dataAt = last?.dataAt ?? null;
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      setStale(!dataAt || now - new Date(dataAt).getTime() > STALE_MS);
      // shortcut: a stalled collector keeps every visible tab refreshing once a minute (cache hits); add a cap if usage shows it.
      // Hidden tabs skip; showing the tab runs this check again (A-02).
      if (!document.hidden && behind(startedAt, now)) router.refresh();
    };
    check();
    const id = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [startedAt, dataAt, router]);
  if (!stale) return null;
  return (
    <span className="inline-flex items-center gap-1 border border-line px-1.5 py-0.5 font-mono text-[11px] tracking-[1px] text-strong">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M8 1.5 15 14H1L8 1.5Z" />
        <path d="M8 6v3.5M8 11.5v.5" />
      </svg>
      데이터 지연
    </span>
  );
}
