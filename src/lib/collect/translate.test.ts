import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { translate, translatePending, translationPrompt } from "./translate";
import { SourceError } from "./util";

const planets = [
  { nameEn: "Malevelon Creek", nameKo: "말레벨론 크릭" },
  { nameEn: "Super Earth", nameKo: "슈퍼지구" },
  { nameEn: "Hellmire", nameKo: "헬마이어" },
];

// Gemini answer carrying `texts` as the JSON array it was asked for.
const gemini = (texts: unknown) =>
  new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(texts) }] } }],
    }),
  );

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GEMINI_MODEL", "");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("translationPrompt", () => {
  it("lists the official terms and only the planets in the text", () => {
    const prompt = translationPrompt(
      ["Hold Malevelon Creek for the Ministry of Truth"],
      planets,
    );
    expect(prompt).toContain("- Major Order → 주요 명령");
    expect(prompt).toContain("- Ministry of Truth → 진리부");
    expect(prompt).toContain("- Malevelon Creek → 말레벨론 크릭");
    expect(prompt).not.toContain("헬마이어");
  });
});

describe("translate", () => {
  it("returns Korean and calls the default model with the key header", async () => {
    fetchMock.mockResolvedValue(gemini(["<i=3>속보</i> 말레벨론 크릭"]));

    const out = await translate(["<i=3>News</i> Malevelon Creek"], planets);

    expect(out).toEqual(["<i=3>속보</i> 말레벨론 크릭"]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/gemini-3.5-flash-lite:generateContent");
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "test-key",
    );
  });

  it("uses GEMINI_MODEL when set", async () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-next");
    fetchMock.mockResolvedValue(gemini(["가"]));
    await translate(["a"], []);
    expect(fetchMock.mock.calls[0][0]).toContain("/gemini-next:");
  });

  it("drops an item whose markup tags moved, keeps the rest", async () => {
    fetchMock.mockResolvedValue(
      gemini(["<i=1>오토마톤</i>이 공격", "<i=3>속보</i>", ""]),
    );

    const out = await translate(
      ["Automatons attack", "<i=3>News</i>", "Empty answer"],
      [],
    );

    expect(out).toEqual([null, "<i=3>속보</i>", null]);
  });

  it("rejects an answer with the wrong number of items", async () => {
    fetchMock.mockResolvedValue(gemini(["하나"]));
    await expect(translate(["one", "two"], [])).rejects.toThrow(SourceError);
  });

  it("throws on quota errors so the caller keeps the English text", async () => {
    fetchMock.mockResolvedValue(new Response("quota", { status: 429 }));
    await expect(translate(["one"], [])).rejects.toMatchObject({
      kind: "http",
      extra: { status: 429 },
    });
  });
});

describe("translatePending", () => {
  const now = new Date("2026-10-27T04:00:00Z");

  function fakeDb(rows: { assignment?: unknown[]; newsItem?: unknown[] }) {
    const tx = vi.fn(async (ops: unknown[]) => ops);
    const model = (name: keyof typeof rows | "planet") => ({
      findMany: async () => (name === "planet" ? planets : (rows[name] ?? [])),
      updateMany: (args: unknown) => ({ op: name, args }),
    });
    const db = {
      $transaction: tx,
      assignment: model("assignment"),
      newsItem: model("newsItem"),
      planet: model("planet"),
    };
    return { db: db as unknown as PrismaClient, tx };
  }

  it("saves machine translations and leaves failed items pending", async () => {
    fetchMock.mockResolvedValue(
      gemini(["제목", "브리핑", "<i=1>잘못</i>", "X 글"]),
    );
    const { db, tx } = fakeDb({
      assignment: [
        { id: BigInt(1), title: "Title", briefing: "Briefing" },
        // Official Korean order: not sent.
        { id: BigInt(2), title: "주요 명령", briefing: "브리핑" },
      ],
      newsItem: [
        { id: BigInt(10), bodyEn: "Dispatch" },
        { id: BigInt(11), bodyEn: "X post" },
      ],
    });

    const result = await translatePending(db, now);

    const sent = JSON.parse(
      JSON.parse(fetchMock.mock.calls[0][1]!.body as string).contents[0]
        .parts[0].text,
    );
    expect(sent).toEqual(["Title", "Briefing", "Dispatch", "X post"]);
    expect(result).toEqual({ count: 4, translated: 2 });
    expect(tx.mock.calls[0][0]).toEqual([
      {
        op: "assignment",
        args: {
          where: { id: BigInt(1), title: "Title", briefing: "Briefing" },
          data: {
            titleKo: "제목",
            briefingKo: "브리핑",
            translation: "machine",
          },
        },
      },
      {
        op: "newsItem",
        args: {
          where: { id: BigInt(11), bodyEn: "X post", translation: null },
          data: { bodyKo: "X 글", translation: "machine" },
        },
      },
    ]);
  });

  it("does not call Gemini when nothing is pending", async () => {
    const { db } = fakeDb({});
    expect(await translatePending(db, now)).toEqual({ count: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
