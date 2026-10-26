import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { fetchJson, fetchText, hasHangul } from "./util";

// Steam news and player count (ADR 0002). No key needed.
const APP_ID = 553850;
const PLAYERS_URL = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${APP_ID}`;
const NEWS_URL = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${APP_ID}&count=10&feeds=steam_community_announcements`;
const RSS_URL = `https://store.steampowered.com/feeds/news/app/${APP_ID}/?l=koreana`;

export const playersSchema = z.object({
  response: z.object({ player_count: z.number().int() }),
});

export const newsSchema = z.object({
  appnews: z.object({
    newsitems: z.array(
      z.object({
        gid: z.string(),
        title: z.string(),
        url: z.string(),
        contents: z.string(),
        date: z.number().int(),
        tags: z.array(z.string()).optional(),
      }),
    ),
  }),
});

type RssItem = {
  title: string;
  link: string;
  description: string;
  publishedAt: Date;
};

const decodeXml = (s: string) =>
  s
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&(#39|apos);/g, "'")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (entity, n: string) => {
      const code = /^x/i.test(n) ? parseInt(n.slice(1), 16) : Number(n);
      return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    })
    .replace(/&amp;/g, "&");

// shortcut: regex parse of Steam's fixed RSS layout, switch to an XML parser if Steam changes the feed format.
export function parseRss(xml: string): RssItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const tag = (name: string) =>
      decodeXml(
        item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? "",
      ).trim();
    return {
      title: tag("title"),
      link: tag("link"),
      description: tag("description"),
      publishedAt: new Date(tag("pubDate")),
    };
  });
}

const isPatch = (title: string, tags?: string[]) =>
  !!tags?.includes("patchnotes") || /\d+\.\d+\.\d+/.test(title);

// API items are the list (English, tags); RSS adds the Korean text and store link.
// IDs differ between the two, so items are matched on the publish second (research news-sources §3).
export function mergeSteamNews(
  api: z.infer<typeof newsSchema>["appnews"]["newsitems"],
  rss: RssItem[],
) {
  const bySecond = new Map(
    rss.map((r) => [Math.floor(r.publishedAt.getTime() / 1000), r]),
  );
  return api.map((a) => {
    const r = bySecond.get(a.date);
    const ko =
      r && hasHangul(r.title)
        ? { titleKo: r.title, bodyKo: r.description }
        : {};
    return {
      externalId: a.gid,
      kind: isPatch(a.title, a.tags) ? "patch" : "announcement",
      titleEn: a.title,
      bodyEn: a.contents,
      url: r?.link ?? a.url,
      publishedAt: new Date(a.date * 1000),
      ...ko,
    };
  });
}

export async function collectSteamPlayers(db: PrismaClient, slot: Date) {
  const { data } = await fetchJson(PLAYERS_URL, playersSchema);
  await db.globalSnapshot.createMany({
    data: [{ slot, steamPlayers: data.response.player_count }],
    skipDuplicates: true,
  });
  return { players: data.response.player_count };
}

export async function collectSteamNews(db: PrismaClient) {
  const [{ data }, { text }] = await Promise.all([
    fetchJson(NEWS_URL, newsSchema),
    fetchText(RSS_URL),
  ]);
  const items = mergeSteamNews(data.appnews.newsitems, parseRss(text));
  await db.$transaction(
    items.map(({ externalId, ...row }) => {
      const where = { source: "steam", externalId };
      return db.newsItem.upsert({
        where: { source_externalId: where },
        create: { ...where, ...row },
        update: row,
      });
    }),
  );
  return { count: items.length };
}
