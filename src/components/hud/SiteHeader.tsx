import Link from "next/link";
import { getLastCollection } from "@/lib/data/collection";
import { formatKst } from "@/lib/hd/format";
import { StaleBadge } from "./StaleBadge";

// Every page shows when data was last collected and whether it is late (F-05-1).
export async function SiteHeader() {
  const last = await getLastCollection();
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[1392px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-[2px] text-strong focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
        >
          HELLDIVERS DASHBOARD
        </Link>
        <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-subtle">
          <span>
            마지막 수집{" "}
            <span className="text-muted tabular-nums">
              {last ? formatKst(last.startedAt) : "—"}
            </span>{" "}
            KST
          </span>
          {last && last.failed.length > 0 && (
            <span className="text-muted">· 일부 소스 실패</span>
          )}
          <StaleBadge startedAt={last?.startedAt ?? null} />
        </p>
      </div>
    </header>
  );
}
