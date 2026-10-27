import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { TERMS } from "@/lib/hd/terms";
import { isKorean, parseJson, SourceError } from "./util";

// Machine translation of English game text with the Gemini free tier (ADR 0006).
const API = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
// One request per run: at most 96 a day, far under the free daily quota.
const BATCH = 20;
export const TIMEOUT_MS = 15_000;

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
    signal: AbortSignal.timeout(TIMEOUT_MS),
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
// Failed items stay pending, so the next run retries them (D-08). After a failed batch the
// caller passes `single`: one item alone shows whether it is what breaks every answer.
export async function translatePending(
  db: PrismaClient,
  now: Date,
  single = false,
) {
  const [orders, news] = await Promise.all([
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
  ]);
  // The original in `where`: text replaced since it was read keeps no stale translation.
  const items = [
    ...orders.map((o) => {
      const fields = [o.title, o.briefing];
      const where = { id: o.id, title: o.title, briefing: o.briefing };
      return {
        // A half-localized order sends only its English field; the Korean one is kept.
        texts: fields.filter((t) => !isKorean(t)),
        save: (ko: string[]) => {
          const [titleKo, briefingKo] = fields.map((t) =>
            isKorean(t) ? t : ko.shift()!,
          );
          return db.assignment.updateMany({
            where,
            data: { titleKo, briefingKo, translation: "machine" },
          });
        },
        fail: () =>
          db.assignment.updateMany({ where, data: { translation: "failed" } }),
      };
    }),
    ...news.map((n) => {
      const where = { id: n.id, bodyEn: n.bodyEn, translation: null };
      return {
        texts: [n.bodyEn!],
        save: ([bodyKo]: string[]) =>
          db.newsItem.updateMany({
            where,
            data: { bodyKo, translation: "machine" },
          }),
        fail: () =>
          db.newsItem.updateMany({ where, data: { translation: "failed" } }),
      };
    }),
  ].filter((i) => i.texts.length > 0);
  let size = 0;
  const batch = single
    ? items.slice(0, 1)
    : items.filter((i) => (size += i.texts.length) <= BATCH);
  const texts = batch.flatMap((i) => i.texts);
  if (texts.length === 0) return { count: 0 };

  const planets = await db.planet.findMany({
    where: { nameKo: { not: null } },
    select: { nameEn: true, nameKo: true },
  });
  let ko: (string | null)[];
  try {
    ko = await translate(texts, planets as PlanetName[]);
  } catch (error) {
    // Alone, an unusable answer is the item's own fault: it stays in English instead of blocking every batch.
    if (single && error instanceof SourceError && error.kind === "validation")
      await batch[0].fail();
    throw error;
  }
  let at = 0;
  const writes = batch.flatMap((i) => {
    const out = ko.slice(at, (at += i.texts.length));
    return out.every((t): t is string => t !== null) ? [i.save(out)] : [];
  });
  await db.$transaction(writes);
  return { count: texts.length, translated: writes.length };
}
