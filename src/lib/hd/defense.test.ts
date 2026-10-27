import { describe, expect, it } from "vitest";
import { defenseOutlook, enemyProgress, warDay } from "./defense";

const at = (iso: string) => new Date(iso);
const start = at("2026-10-27T00:00:00Z");
const end = at("2026-10-28T00:00:00Z");

describe("enemyProgress", () => {
  it("is the share of the event time that has passed", () => {
    expect(enemyProgress(start, end, at("2026-10-27T06:00:00Z"))).toBe(0.25);
    expect(enemyProgress(start, end, at("2026-10-29T00:00:00Z"))).toBe(1);
    expect(enemyProgress(start, end, at("2026-10-26T00:00:00Z"))).toBe(0);
  });
});

describe("defenseOutlook", () => {
  const now = at("2026-10-27T14:00:00Z"); // 10 hours left
  it("compares the hourly pace with what is still needed", () => {
    // 50% left in 10h needs 5%/h
    expect(defenseOutlook(0.5, 0.06, end, now)?.good).toBe(true);
    expect(defenseOutlook(0.5, 0.04, end, now)).toEqual({
      good: false,
      text: "위험 · 속도 부족",
    });
  });

  it("handles finished, timed-out and unknown cases", () => {
    expect(defenseOutlook(1, null, end, now)?.text).toBe("방어 성공");
    expect(
      defenseOutlook(0.5, 0.1, end, at("2026-10-28T01:00:00Z"))?.good,
    ).toBe(false);
    expect(defenseOutlook(0.5, null, end, now)).toBeNull();
  });
});

it("counts war days from 1", () => {
  expect(warDay(start, at("2026-10-27T23:00:00Z"))).toBe(1);
  expect(warDay(start, at("2026-10-29T01:00:00Z"))).toBe(3);
});
