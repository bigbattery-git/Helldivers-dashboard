import { revalidateTag } from "next/cache";
import { after, connection } from "next/server";
import { authorized } from "@/lib/collect/auth";
import { runCollection } from "@/lib/collect/run";
import { TAGS } from "@/lib/data/cache";
import { getDb } from "@/lib/db";

export const maxDuration = 60;

// Cached pages that read the collected data.
const WARM_PATHS = ["/", "/news", "/stats"];

// Called every 15 minutes by Supabase Cron (ADR 0004, SRS v3 §5).
export async function POST(request: Request) {
  await connection();
  if (
    !authorized(request.headers.get("authorization"), process.env.CRON_SECRET)
  )
    return Response.json({ ok: false }, { status: 401 });
  const { slot, results } = await runCollection(getDb());
  // Expire the cached screens now (D-07): with "max" the page and its cached reads each served
  // one more stale round, so the warm-up below and open tabs at slot + 2 min still got old data.
  for (const tag of TAGS) revalidateTag(tag, { expire: 0 });
  // Request the pages ourselves so this request pays the blocking render, not a visitor.
  after(async () => {
    // shortcut: the tag invalidation is flushed concurrently with `after`, so wait for it; switch to a separate cron call if warms still miss.
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await Promise.allSettled(
      WARM_PATHS.map((path) =>
        fetch(new URL(path, request.url), {
          signal: AbortSignal.timeout(10_000),
        }),
      ),
    );
  });
  return Response.json({ ok: true, slot, results });
}
