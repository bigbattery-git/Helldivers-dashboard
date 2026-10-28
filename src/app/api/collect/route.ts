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
  // Rebuild the cached screens from the new rows (D-07); stale pages serve until then.
  for (const tag of TAGS) revalidateTag(tag, "max");
  // "max" hands the stale page to the first request, which on a quiet site is a visitor hours later.
  // Request the pages ourselves so that first request is this one and visitors get the fresh render.
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
