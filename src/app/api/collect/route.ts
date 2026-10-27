import { revalidateTag } from "next/cache";
import { connection } from "next/server";
import { authorized } from "@/lib/collect/auth";
import { runCollection } from "@/lib/collect/run";
import { TAGS } from "@/lib/data/cache";
import { getDb } from "@/lib/db";

export const maxDuration = 60;

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
  return Response.json({ ok: true, slot, results });
}
