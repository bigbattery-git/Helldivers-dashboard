import { describe, expect, it } from "vitest";
import { defenseProgress, liberation, ratePerHour } from "./liberation";

describe("liberation", () => {
  it("is 1 - health / maxHealth, clamped", () => {
    expect(liberation(250_000, 1_000_000)).toBe(0.75);
    expect(liberation(1_200_000, 1_000_000)).toBe(0);
    expect(liberation(5, 0)).toBe(0);
    expect(defenseProgress(0, 600_000)).toBe(1);
  });

  it("gives the change per hour between snapshots (F-01-5)", () => {
    const at = (iso: string) => new Date(iso);
    const before = { value: 0.6, at: at("2026-10-27T03:00:00Z") };
    expect(
      ratePerHour(before, { value: 0.624, at: at("2026-10-27T04:00:00Z") }),
    ).toBeCloseTo(0.024);
    expect(
      ratePerHour(before, { value: 0.63, at: at("2026-10-27T03:30:00Z") }),
    ).toBeCloseTo(0.06);
    expect(ratePerHour(before, before)).toBeNull();
  });
});
