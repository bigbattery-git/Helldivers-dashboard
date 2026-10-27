import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { TERMS } from "@/lib/hd/terms";
import { hasHangul, parseJson, SourceError } from "./util";

// Machine translation of English game text with the Gemini free tier (ADR 0006).
const API = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
// One request per run: at most 96 a day, far under the free daily quota.
const BATCH = 20;

const responseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({ parts: z.array(z.object({ text: z.string() })) }),
      }),
    )
    .min(1),
});

// `<i=N>` / `</i>` in order; a translation must keep exactly the source's tags.
const tags = (text: string) => (text.match(/<\/?i(=\d+)?>/g) ?? []).join("");

type PlanetName = { nameEn: string; nameKo: string };

export function translationPrompt(texts: string[], planets: PlanetName[]) {
  const used = planets.filter((p) => texts.some((t) => t.includes(p.nameEn)));
  const list = (pairs: [string, string][]) =>
    pairs.map(([en, ko]) => `- ${en} → ${ko}`).join("\n");
  return [
    "Translate each Helldivers 2 announcement in the JSON array from English to Korean.",
    "Return a JSON array of strings with the same length and order.",
    "Keep numbers, URLs, hashtags and @mentions as they are.",
    "Keep markup tags such as <i=1>…</i> exactly: the same tags, in the same order, around the translated words. Never add or remove a tag.",
    "Use these official Korean terms:",
    list(Object.entries(TERMS)),
    ...(used.length
      ? [
          "Write these planet names in Korean:",
          list(used.map((p) => [p.nameEn, p.nameKo])),
        ]
      : []),
  ].join("\n");
}

// Korean for each text, or null where the result broke the markup. Throws when the call fails.
export async function translate(
  texts: string[],
  planets: PlanetName[],
): Promise<(string | null)[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `${API}/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: translationPrompt(texts, planets) }],
      },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(texts) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: { type: "ARRAY", items: { type: "STRING" } },
      },
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const body = await res.text();
  if (!res.ok)
    throw new SourceError(`HTTP ${res.status} ${url}`, "http", {
      status: res.status,
      body: body.slice(0, 2048),
    });
  const answer = parseJson(body, responseSchema, url).candidates[0].content
    .parts[0]?.text;
  const out = parseJson(
    answer ?? "",
    z.array(z.string()).length(texts.length),
    url,
  );
  return out.map((ko, i) =>
    ko.trim() && tags(ko) === tags(texts[i]) ? ko : null,
  );
}

// Translates what is still English: current major orders, dispatches and X posts.
// Failed items stay pending, so the next run retries them (D-08).
export async function translatePending(db: PrismaClient, now: Date) {
  const [orders, news, planets] = await Promise.all([
    db.assignment.findMany({
      where: { translation: null, expiresAt: { gt: now } },
      select: { id: true, title: true, briefing: true },
    }),
    db.newsItem.findMany({
      where: {
        translation: null,
        bodyKo: null,
        bodyEn: { not: null },
        source: { in: ["dispatch", "x"] },
      },
      orderBy: { publishedAt: "desc" },
      take: BATCH,
      select: { id: true, bodyEn: true },
    }),
    db.planet.findMany({
      where: { nameKo: { not: null } },
      select: { nameEn: true, nameKo: true },
    }),
  ]);
  const english = orders.filter((o) => !hasHangul(o.title + o.briefing));
  const texts = [
    ...english.flatMap((o) => [o.title, o.briefing]),
    ...news.map((n) => n.bodyEn!),
  ].slice(0, BATCH);
  if (texts.length === 0) return { count: 0 };

  const ko = await translate(texts, planets as PlanetName[]);
  const writes = [
    // The original in `where`: text replaced since it was read keeps no stale translation.
    ...english.flatMap((o, i) => {
      const [titleKo, briefingKo] = [ko[2 * i], ko[2 * i + 1]];
      return titleKo && briefingKo
        ? [
            db.assignment.updateMany({
              where: { id: o.id, title: o.title, briefing: o.briefing },
              data: { titleKo, briefingKo, translation: "machine" },
            }),
          ]
        : [];
    }),
    ...news.flatMap((n, i) => {
      const bodyKo = ko[2 * english.length + i];
      return bodyKo
        ? [
            db.newsItem.updateMany({
              where: { id: n.id, bodyEn: n.bodyEn, translation: null },
              data: { bodyKo, translation: "machine" },
            }),
          ]
        : [];
    }),
  ];
  await db.$transaction(writes);
  return { count: texts.length, translated: writes.length };
}
