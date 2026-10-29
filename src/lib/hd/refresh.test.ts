import { describe, expect, it } from "vitest";
import { behind } from "./refresh";

const at = (iso: string) => Date.parse(iso);

describe("behind", () => {
  it.each([
    // Before slot + 2 min the collector may still be running.
    ["2026-10-29T11:45:00Z", "2026-10-29T12:01:59Z", false],
    ["2026-10-29T11:45:00Z", "2026-10-29T12:02:00Z", true],
    ["2026-10-29T11:45:00Z", "2026-10-29T12:14:59Z", true],
    // The current slot's run is on screen.
    ["2026-10-29T12:00:00.08Z", "2026-10-29T12:02:00Z", false],
    ["2026-10-29T12:06:30Z", "2026-10-29T12:10:00Z", false],
    // Collection stalled for several slots: keep trying.
    ["2026-10-29T10:00:00Z", "2026-10-29T12:03:00Z", true],
  ])("run %s at %s -> %s", (startedAt, now, expected) => {
    expect(behind(startedAt, at(now))).toBe(expected);
  });

  it("treats a page without a run (build shell) as behind", () => {
    expect(behind(null, at("2026-10-29T12:05:00Z"))).toBe(true);
    expect(behind(null, at("2026-10-29T12:01:00Z"))).toBe(false);
  });
});
