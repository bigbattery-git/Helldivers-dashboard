import { describe, expect, it } from "vitest";
import { enemyProgress, warDay } from "./defense";

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

it("counts war days from 1", () => {
  expect(warDay(start, at("2026-10-27T23:00:00Z"))).toBe(1);
  expect(warDay(start, at("2026-10-29T01:00:00Z"))).toBe(3);
});
