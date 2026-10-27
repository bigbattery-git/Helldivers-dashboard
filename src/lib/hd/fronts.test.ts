import { describe, expect, it } from "vitest";
import { factionSummary, sortFronts } from "./fronts";

const fronts = [
  { index: 1, faction: 2, players: 500, progress: 0.1 },
  { index: 2, faction: 3, players: 9000, progress: 0.5 },
  { index: 3, faction: 2, players: 3000, progress: 0.9 },
  { index: 4, faction: 4, players: 100, progress: 0.5 },
];
const ids = (list: { index: number }[]) => list.map((f) => f.index);

describe("sortFronts", () => {
  it("puts major-order targets first, then players", () => {
    expect(ids(sortFronts(fronts, "default", new Set([4, 1])))).toEqual([
      1, 4, 2, 3,
    ]);
    expect(ids(sortFronts(fronts, "default", new Set()))).toEqual([2, 3, 1, 4]);
  });

  it("sorts by progress or faction, players breaking ties", () => {
    expect(ids(sortFronts(fronts, "progress", new Set()))).toEqual([
      3, 2, 4, 1,
    ]);
    expect(ids(sortFronts(fronts, "faction", new Set()))).toEqual([3, 1, 2, 4]);
  });

  it("does not mutate the input", () => {
    sortFronts(fronts, "progress", new Set());
    expect(ids(fronts)).toEqual([1, 2, 3, 4]);
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
