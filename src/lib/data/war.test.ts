import { describe, expect, it, vi } from "vitest";
import { getWarOverview } from "./war";

vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));

const slot = new Date("2026-10-30T09:00:00Z");
const hourAgo = new Date("2026-10-30T08:00:00Z");

const planet = (index: number) => ({
  index,
  nameEn: `P${index}`,
  nameKo: null,
  sector: null,
  maxHealth: 1_000_000,
  disabled: false,
  positionX: 0,
  positionY: 0,
});
const snap = (planetIndex: number, eventHealth: number | null) => ({
  planetIndex,
  owner: 1,
  health: 1_000_000,
  players: 100,
  eventHealth,
});
// Planet 1: defense started 15 minutes ago. Planet 2: defense running for two hours.
const event = (planetIndex: number, startedAt: string) => ({
  planetIndex,
  race: 2,
  maxHealth: 100,
  startedAt: new Date(startedAt),
  expiresAt: new Date("2026-10-31T00:00:00Z"),
});

const db = {
  planetSnapshot: {
    findFirst: async () => ({ slot }),
    findMany: async ({ where }: { where: { slot: Date } }) =>
      where.slot.getTime() === slot.getTime()
        ? [snap(1, 75), snap(2, 75)]
        : [snap(1, null), snap(2, 100)],
  },
  war: { findFirst: async () => ({ startedAt: hourAgo }) },
  planet: { findMany: async () => [planet(1), planet(2)] },
  campaign: {
    findMany: async () => [{ planetIndex: 1 }, { planetIndex: 2 }],
  },
  planetEvent: {
    findMany: async () => [
      event(1, "2026-10-30T08:45:00Z"),
      event(2, "2026-10-30T07:00:00Z"),
    ],
  },
  planetEffect: { findMany: async () => [] },
};
vi.mock("@/lib/db", () => ({ getDb: () => db }));

describe("getWarOverview", () => {
  it("gives no defense pace without an hour-old record of the same defense", async () => {
    const fronts = (await getWarOverview())!.fronts;
    expect(fronts.map((f) => [f.index, f.progress, f.perHour])).toEqual([
      [1, 0.25, null],
      [2, 0.25, 0.25],
    ]);
  });
});
