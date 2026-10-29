import { describe, expect, it } from "vitest";
import { refreshDelay } from "./refresh";

const MIN = 60_000;

describe("refreshDelay", () => {
  it.each([
    ["2026-10-29T12:00:00Z", 2 * MIN],
    ["2026-10-29T12:01:00Z", 1 * MIN],
    ["2026-10-29T12:02:00Z", 15 * MIN],
    ["2026-10-29T12:02:01Z", 15 * MIN - 1_000],
    ["2026-10-29T12:14:59Z", 2 * MIN + 1_000],
    ["2026-10-29T12:46:00Z", 1 * MIN],
  ])("at %s waits %d ms", (at, ms) => {
    expect(refreshDelay(Date.parse(at))).toBe(ms);
  });
});
