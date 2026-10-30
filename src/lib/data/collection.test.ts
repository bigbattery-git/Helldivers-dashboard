import { describe, expect, it, vi } from "vitest";
import { getLastCollection } from "./collection";

vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));

const findFirst = vi.fn();
vi.mock("@/lib/db", () => ({
  getDb: () => ({ collectionRun: { findFirst } }),
}));

describe("getLastCollection", () => {
  it("counts the delay from the last run whose Status succeeded (F-05-1)", async () => {
    findFirst
      .mockResolvedValueOnce({
        startedAt: new Date("2026-10-30T09:00:00Z"),
        results: { status: { status: "error" }, steamNews: { status: "ok" } },
      })
      .mockResolvedValueOnce({ startedAt: new Date("2026-10-30T07:30:00Z") });
    expect(await getLastCollection()).toMatchObject({
      startedAt: "2026-10-30T09:00:00.000Z",
      dataAt: "2026-10-30T07:30:00.000Z",
      failed: ["status"],
    });
  });
});
