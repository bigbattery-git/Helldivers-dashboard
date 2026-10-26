import { connection } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  // Request time only: keeps `next build` from touching the database.
  await connection();
  try {
    const db = getDb();
    await db.$queryRaw`select 1`;
    const last = await db.collectionRun.findFirst({
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    });
    return Response.json({
      ok: true,
      db: "ok",
      lastCollectedAt: last?.startedAt ?? null,
    });
  } catch (error) {
    console.error("health check failed", error);
    return Response.json({ ok: false, db: "error" }, { status: 503 });
  }
}
