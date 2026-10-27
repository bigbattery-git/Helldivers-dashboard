import { describe, expect, it } from "vitest";
import { flipsLeft, labelledPlanets, labelOnRight, toMapPercent } from "./map";

describe("toMapPercent", () => {
  it("puts Super Earth in the middle and positive y at the top", () => {
    expect(toMapPercent(0, 0)).toEqual({ left: 50, top: 50 });
    // Cyberstan, deep in Automaton space (top left in game)
    const cyberstan = toMapPercent(-0.44, 0.7);
    expect(cyberstan.left).toBeCloseTo(28);
    expect(cyberstan.top).toBeCloseTo(15);
    expect(flipsLeft(toMapPercent(0.5, 0).left)).toBe(true);
    expect(flipsLeft(toMapPercent(0.1, 0).left)).toBe(false);
  });

  it("keeps labels inside the map near the edges", () => {
    expect(labelOnRight(70)).toBe(true);
    expect(labelOnRight(40)).toBe(false);
    expect(labelOnRight(97)).toBe(false);
    expect(labelOnRight(5)).toBe(true);
  });
});

describe("labelledPlanets", () => {
  it("labels top planets, major-order targets and defenses only", () => {
    const fronts = [
      { index: 1, players: 900, defense: null },
      { index: 2, players: 800, defense: null },
      { index: 3, players: 10, defense: { expiresAt: "x" } },
      { index: 4, players: 5, defense: null },
      { index: 5, players: 1, defense: null },
    ];
    expect([...labelledPlanets(fronts, new Set([5]), 2)].sort()).toEqual([
      1, 2, 3, 5,
    ]);
  });
});
