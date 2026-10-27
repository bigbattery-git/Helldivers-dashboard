import type { LastCollection } from "@/lib/data/collection";

const NOTE = "일부 데이터를 커뮤니티 API(영어)에서 받음";

// Header data status when the last run used the community mirror (F-05-2). Same frame as the stale badge.
export function FallbackBadge({ last }: { last: LastCollection | null }) {
  if (!last?.fallback.length) return null;
  return (
    <span
      title={NOTE}
      className="inline-flex items-center gap-1 border border-line px-1.5 py-0.5 font-mono text-[11px] tracking-[1px] text-strong"
    >
      폴백<span className="sr-only">: {NOTE}</span>
    </span>
  );
}
