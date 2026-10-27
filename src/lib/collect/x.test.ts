import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { fetchJson } from "./util";
import {
  checkDeletedX,
  collectX,
  lookupSchema,
  postText,
  timelineSchema,
} from "./x";

vi.mock("./util", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./util")>()),
  fetchJson: vi.fn(),
}));

const now = new Date("2026-10-27T04:00:00Z");

function fakeDb(stored: { externalId: string }[] = []) {
  const newsItem = {
    findFirst: vi.fn(async () => stored[0] ?? null),
    findMany: vi.fn(async () => stored),
    createMany: vi.fn(async () => ({ count: 0 })),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  };
  return { newsItem, db: { newsItem } as unknown as PrismaClient };
}

const respond = (data: unknown) =>
  vi.mocked(fetchJson).mockResolvedValue({ data, date: now });

afterEach(() => {
  vi.mocked(fetchJson).mockReset();
  vi.unstubAllEnvs();
});

// Trimmed from the 2026-10-27 measurement (research news-sources §5).
const post = {
  id: "1850000000000000001",
  text: "Liberty Day &amp; more https://t.co/abc",
  created_at: "2026-10-26T16:01:00.000Z",
  entities: {
    urls: [
      {
        url: "https://t.co/abc",
        expanded_url: "https://www.youtube.com/watch?v=x",
      },
    ],
  },
};

describe("postText", () => {
  it("expands t.co links and undoes HTML escapes", () => {
    expect(postText(post)).toBe(
      "Liberty Day & more https://www.youtube.com/watch?v=x",
    );
  });
});

describe("collectX", () => {
  it("takes the latest 5 on the first run, with the bearer token", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "secret");
    respond(timelineSchema.parse({ data: [post] }));
    const { db, newsItem } = fakeDb();

    expect(await collectX(db)).toEqual({ count: 1 });

    const [url, , headers] = vi.mocked(fetchJson).mock.calls[0];
    expect(url).toContain("/users/1654403648598802436/tweets?max_results=5");
    expect(url).not.toContain("since_id");
    expect(headers).toEqual({ Authorization: "Bearer secret" });
    expect(newsItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          source: "x",
          externalId: post.id,
          kind: "x",
          bodyEn: "Liberty Day & more https://www.youtube.com/watch?v=x",
          url: `https://x.com/helldivers2/status/${post.id}`,
          publishedAt: new Date(post.created_at),
        },
      ],
      skipDuplicates: true,
    });
  });

  it("asks only for posts after the last stored one", async () => {
    respond(timelineSchema.parse({ meta: { result_count: 0 } }));
    const { db, newsItem } = fakeDb([{ externalId: "42" }]);

    expect(await collectX(db)).toEqual({ count: 0 });

    expect(vi.mocked(fetchJson).mock.calls[0][0]).toContain("since_id=42");
    expect(newsItem.createMany).toHaveBeenCalledWith({
      data: [],
      skipDuplicates: true,
    });
  });
});

describe("checkDeletedX", () => {
  it("deletes posts X reports as gone", async () => {
    respond(
      lookupSchema.parse({
        data: [{ id: "1" }],
        errors: [{ resource_id: "2", type: "resource-not-found" }],
      }),
    );
    const { db, newsItem } = fakeDb([{ externalId: "1" }, { externalId: "2" }]);

    expect(await checkDeletedX(db, now)).toEqual({ checked: 2, deleted: 1 });

    expect(vi.mocked(fetchJson).mock.calls[0][0]).toContain("tweets?ids=1,2");
    expect(newsItem.deleteMany).toHaveBeenCalledWith({
      where: { source: "x", externalId: { in: ["2"] } },
    });
  });

  it("makes no call when there is nothing recent", async () => {
    const { db } = fakeDb();
    expect(await checkDeletedX(db, now)).toEqual({ checked: 0, deleted: 0 });
    expect(fetchJson).not.toHaveBeenCalled();
  });
});
