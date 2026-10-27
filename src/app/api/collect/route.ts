import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { connection } from "next/server";
import { runCollection } from "@/lib/collect/run";
import { TAGS } from "@/lib/data/cache";
import { getDb } from "@/lib/db";

export const maxDuration = 60;

function authorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const given = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Called every 15 minutes by Supabase Cron (ADR 0004, SRS v3 §5).
export async function POST(request: Request) {
  await connection();
  if (!authorized(request.headers.get("authorization")))
    return Response.json({ ok: false }, { status: 401 });
  const { slot, results } = await runCollection(getDb());
  // Rebuild the cached screens from the new rows (D-07); stale pages serve until then.
  for (const tag of TAGS) revalidateTag(tag, "max");
  return Response.json({ ok: true, slot, results });
}
