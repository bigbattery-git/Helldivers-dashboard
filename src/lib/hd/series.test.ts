import { describe, expect, it } from "vitest";
import {
  allRanges,
  bucketAverage,
  forRange,
  linePath,
  type Point,
} from "./series";

const at = (h: number, m = 0) =>
  new Date(Date.UTC(2026, 9, 27, h, m)).toISOString();

describe("bucketAverage", () => {
  it("averages each hour and stamps the hour start (F-04-5)", () => {
    const points: Point[] = [
      { at: at(1, 0), value: 10 },
      { at: at(1, 45), value: 30 },
      { at: at(2, 15), value: 5 },
    ];
    expect(bucketAverage(points, 3_600_000)).toEqual([
      { at: at(1), value: 20 },
      { at: at(2), value: 5 },
    ]);
  });
});

describe("forRange", () => {
  it("keeps 24h raw and cuts the window at the newest point", () => {
    const points = [0, 10, 20, 25].map((h) => ({
      at: new Date(Date.UTC(2026, 9, 26) + h * 3_600_000).toISOString(),
      value: h,
    }));
    expect(forRange(points, "24h").map((p) => p.value)).toEqual([10, 20, 25]);
    expect(forRange(points, "7d")).toHaveLength(4);
    expect(allRanges([])).toEqual({ "24h": [], "7d": [], "30d": [] });
  });
});

it("draws a path on shared axes", () => {
  const box = { t0: Date.parse(at(0)), t1: Date.parse(at(2)), v0: 0, v1: 10 };
  expect(
    linePath(
      [
        { at: at(0), value: 0 },
        { at: at(1), value: 10 },
      ],
      box,
      100,
      50,
    ),
  ).toBe("M0,50L50,0");
});
