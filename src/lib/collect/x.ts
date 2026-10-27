import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { fetchJson } from "./util";

// @helldivers2 posts through X API v2 (ADR 0002). Every post read is billed, so only new posts are asked for.
const API = "https://api.x.com/2";
// Fixed so the billed user lookup is never repeated (research news-sources §5).
const USER_ID = "1654403648598802436";
const CHECK_WINDOW_MS = 72 * 60 * 60 * 1000;

const postSchema = z.object({
  id: z.string(),
  text: z.string(),
  created_at: z.string(),
  entities: z
    .object({
      urls: z
        .array(
          z.object({ url: z.string(), expanded_url: z.string().optional() }),
        )
        .optional(),
    })
    .optional(),
});

// `data` and `newest_id` are absent when there is nothing new.
export const timelineSchema = z.object({
  data: z.array(postSchema).optional(),
});

// Deleted or hidden posts come back in `errors` with their id (HTTP 200).
export const lookupSchema = z.object({
  data: z.array(z.object({ id: z.string() })).optional(),
  errors: z.array(z.object({ resource_id: z.string().optional() })).optional(),
});

const auth = () => ({ Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` });

export const postUrl = (id: string) => `https://x.com/helldivers2/status/${id}`;

// Post text as written: t.co links back to their targets, X's HTML escapes undone.
export function postText(post: z.infer<typeof postSchema>) {
  const text = (post.entities?.urls ?? []).reduce(
    (t, u) => t.replaceAll(u.url, u.expanded_url ?? u.url),
    post.text,
  );
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Every slot: posts newer than the last stored one (since_id). The first run takes the latest 5.
export async function collectX(db: PrismaClient) {
  const last = await db.newsItem.findFirst({
    where: { source: "x" },
    orderBy: { publishedAt: "desc" },
    select: { externalId: true },
  });
  const params = new URLSearchParams({
    max_results: last ? "100" : "5",
    exclude: "retweets,replies",
    "tweet.fields": "created_at,entities",
  });
  if (last) params.set("since_id", last.externalId);
  const { data } = await fetchJson(
    `${API}/users/${USER_ID}/tweets?${params}`,
    timelineSchema,
    auth(),
  );
  const posts = data.data ?? [];
  await db.newsItem.createMany({
    data: posts.map((p) => ({
      source: "x",
      externalId: p.id,
      kind: "x",
      bodyEn: postText(p),
      url: postUrl(p.id),
      publishedAt: new Date(p.created_at),
    })),
    skipDuplicates: true,
  });
  return { count: posts.length };
}

// Daily: posts deleted on X within the last 72 hours are deleted here too (X developer policy).
export async function checkDeletedX(db: PrismaClient, now: Date) {
  const recent = await db.newsItem.findMany({
    where: {
      source: "x",
      publishedAt: { gte: new Date(now.getTime() - CHECK_WINDOW_MS) },
    },
    orderBy: { publishedAt: "desc" },
    // The lookup takes at most 100 ids.
    take: 100,
    select: { externalId: true },
  });
  if (recent.length === 0) return { checked: 0, deleted: 0 };
  const ids = recent.map((r) => r.externalId);
  const { data } = await fetchJson(
    `${API}/tweets?ids=${ids.join(",")}`,
    lookupSchema,
    auth(),
  );
  const gone = (data.errors ?? []).flatMap((e) =>
    e.resource_id && ids.includes(e.resource_id) ? [e.resource_id] : [],
  );
  if (gone.length)
    await db.newsItem.deleteMany({
      where: { source: "x", externalId: { in: gone } },
    });
  return { checked: ids.length, deleted: gone.length };
}
