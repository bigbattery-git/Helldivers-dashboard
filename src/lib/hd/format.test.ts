import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatDuration,
  formatKst,
  formatNumber,
  formatPercent,
  formatRate,
} from "./format";

describe("formatKst", () => {
  it("shows UTC times in KST, crossing midnight", () => {
    expect(formatKst("2026-10-24T12:00:00Z")).toBe("10.24 21:00");
    expect(formatKst("2026-10-24T15:30:00Z")).toBe("10.25 00:30");
    expect(formatKst(new Date("2026-10-24T15:30:00Z"), true)).toBe("10.25");
  });
});

describe("formatDuration", () => {
  it.each([
    [30_000, "1분 미만"],
    [12 * 60_000, "12분"],
    [(3 * 60 + 12) * 60_000, "3시간 12분"],
    [3 * 3_600_000, "3시간"],
    [(2 * 24 + 3) * 3_600_000, "2일 3시간"],
    [-5_000, "1분 미만"],
  ])("%d ms -> %s", (ms, text) => expect(formatDuration(ms)).toBe(text));
});

describe("formatCountdown", () => {
  it("pads and keeps hours past a day", () => {
    expect(formatCountdown((18 * 3600 + 42 * 60 + 7) * 1000)).toBe("18:42:07");
    expect(formatCountdown((49 * 3600 + 13 * 60) * 1000)).toBe("49:13:00");
    expect(formatCountdown(-1)).toBe("00:00:00");
  });
});

describe("numbers", () => {
  it("formats counts, percents and rates", () => {
    expect(formatNumber(84210)).toBe("84,210");
    expect(formatPercent(0.6234)).toBe("62%");
    expect(formatRate(0.024)).toBe("+2.4%/h");
    expect(formatRate(-0.031)).toBe("-3.1%/h");
    expect(formatRate(-0.0001)).toBe("0.0%/h");
  });
});
