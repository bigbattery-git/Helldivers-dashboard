import { describe, expect, it } from "vitest";
import { factionSummary, frontEta, topFronts } from "./fronts";

const fronts = [
  { index: 1, faction: 2, players: 500, progress: 0.1 },
  { index: 2, faction: 3, players: 9000, progress: 0.5 },
  { index: 3, faction: 2, players: 3000, progress: 0.9 },
  { index: 4, faction: 4, players: 100, progress: 0.5 },
];
const ids = (list: { index: number }[]) => list.map((f) => f.index);

const front = (index: number, players: number, defense = false) => ({
  index,
  faction: 2,
  players,
  progress: 0.5,
  defense: defense ? { expiresAt: "2026-10-29T00:00:00.000Z" } : null,
});

describe("topFronts", () => {
  it("keeps defenses, fills by players and shows by players", () => {
    const list = [
      front(1, 10, true),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => front(i, i * 100)),
    ];
    expect(ids(topFronts(list))).toEqual([10, 9, 8, 7, 6, 5, 4, 1]);
  });

  it("caps defenses at n by players", () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => front(i, i, true));
    expect(ids(topFronts([...list, front(10, 999)]))).toEqual([
      9, 8, 7, 6, 5, 4, 3, 2,
    ]);
  });

  it("returns what there is when fewer than n", () => {
    expect(ids(topFronts([front(1, 5), front(2, 50)]))).toEqual([2, 1]);
  });
});

describe("frontEta", () => {
  const slot = "2026-10-28T00:00:00.000Z";
  const lib = (progress: number, perHour: number | null) =>
    frontEta({ progress, perHour, defense: null }, slot);
  const def = (progress: number, perHour: number | null) =>
    frontEta(
      { progress, perHour, defense: { expiresAt: "2026-10-28T10:00:00.000Z" } },
      slot,
    );

  it("extrapolates liberation to 100% or 0%", () => {
    expect(lib(0.5, 0.1)).toEqual({
      kind: "victory",
      at: "2026-10-28T05:00:00.000Z",
    });
    expect(lib(0.5, -0.25)).toEqual({
      kind: "withdraw",
      at: "2026-10-28T02:00:00.000Z",
    });
    expect(lib(0.5, 0)).toEqual({ kind: "stalled", at: null });
    expect(lib(0.5, null)).toEqual({ kind: "stalled", at: null });
    expect(lib(0.5, 1e-15)).toEqual({ kind: "stalled", at: null });
    expect(lib(1, 0.1)).toEqual({ kind: "done", at: null });
  });

  it("fails a defense that cannot reach 100% before it expires", () => {
    expect(def(0.5, 0.1)).toEqual({
      kind: "victory",
      at: "2026-10-28T05:00:00.000Z",
    });
    expect(def(0.5, 0.01)).toEqual({ kind: "fail", at: null });
    expect(def(0.5, -0.1)).toEqual({ kind: "fail", at: null });
    expect(def(0.5, null)).toEqual({ kind: "stalled", at: null });
  });
});

describe("factionSummary", () => {
  it("counts fronts and players per faction", () => {
    expect(factionSummary(fronts)).toEqual([
      { faction: 2, fronts: 2, players: 3500 },
      { faction: 3, fronts: 1, players: 9000 },
      { faction: 4, fronts: 1, players: 100 },
    ]);
  });
});
