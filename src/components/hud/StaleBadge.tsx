"use client";

import { useEffect, useState } from "react";

const STALE_MS = 30 * 60_000;

// The cached page is frozen at render time, so the delay is judged in the browser (F-05-1).
export function StaleBadge({ startedAt }: { startedAt: string | null }) {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const check = () =>
      setStale(
        !startedAt || Date.now() - new Date(startedAt).getTime() > STALE_MS,
      );
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [startedAt]);
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
