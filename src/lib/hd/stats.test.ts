import { describe, expect, it } from "vitest";
import { factionShares, statsDelta } from "./stats";

describe("factionShares", () => {
  it("splits players among enemy factions per slot, leaving out human-held planets", () => {
    const rows = [
      { slot: "2026-10-27T01:00:00.000Z", owner: 2, players: 300 },
      { slot: "2026-10-27T01:00:00.000Z", owner: 3, players: 100 },
      { slot: "2026-10-27T01:00:00.000Z", owner: 1, players: 999 },
      { slot: "2026-10-27T00:45:00.000Z", owner: 2, players: 50 },
    ];
    expect(factionShares(rows)).toEqual({
      2: [
        { at: "2026-10-27T00:45:00.000Z", value: 1 },
        { at: "2026-10-27T01:00:00.000Z", value: 0.75 },
      ],
      3: [{ at: "2026-10-27T01:00:00.000Z", value: 0.25 }],
    });
  });
});

describe("statsDelta", () => {
  it("gives totals and growth for known counters only", () => {
    expect(
      statsDelta(
        { bugKills: 1500, missionsWon: 20, extra: 1 },
        { bugKills: 1000, missionsWon: 18 },
      ),
    ).toEqual([
      { key: "bugKills", label: "테르미니드 처치", total: 1500, delta: 500 },
      { key: "missionsWon", label: "임무 성공", total: 20, delta: 2 },
    ]);
  });
});
