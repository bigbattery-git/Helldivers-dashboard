import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mergeSteamNews, newsSchema, parseRss, playersSchema } from "./steam";
import news from "./__fixtures__/steam-news.json";
import players from "./__fixtures__/steam-players.json";

const rssXml = readFileSync(
  new URL("./__fixtures__/steam-rss.xml", import.meta.url),
  "utf8",
);

describe("parseRss", () => {
  it("reads items with decoded HTML and dates", () => {
    const items = parseRss(rssXml);
    expect(items).toHaveLength(3);
    expect(items[1].title).toBe("자유의 공백: 7.2.0");
    expect(items[0].publishedAt.toISOString()).toBe("2026-10-22T12:00:04.000Z");
    expect(items[0].description.startsWith('<p class="bb_paragraph">')).toBe(
      true,
    );
    expect(items[0].link).toMatch(/^https:\/\/store\.steampowered\.com\//);
  });
});

describe("mergeSteamNews", () => {
  const items = mergeSteamNews(
    newsSchema.parse(news).appnews.newsitems,
    parseRss(rssXml),
  );

  it("adds Korean text by matching the publish second", () => {
    const patch = items.find((i) => i.titleEn === "Devoid of Liberty: 7.2.0");
    expect(patch?.titleKo).toBe("자유의 공백: 7.2.0");
    expect(patch?.bodyKo).toBeTruthy();
    expect(patch?.url).toMatch(/store\.steampowered\.com\/news/);
  });

  it("leaves untranslated items without Korean columns", () => {
    const hotfix = items.find((i) => i.titleEn === "Devoid of Liberty: 7.2.1");
    expect(hotfix?.titleKo).toBeUndefined();
  });

  it("detects patch notes by tag or version in the title", () => {
    expect(items.map((i) => i.kind)).toEqual([
      "patch", // tagged
      "patch", // untagged 7.2.0
      "announcement",
    ]);
  });
});

it("players schema accepts the real response", () => {
  expect(playersSchema.parse(players).response.player_count).toBeGreaterThan(0);
});
