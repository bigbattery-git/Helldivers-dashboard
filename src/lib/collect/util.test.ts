import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  hasHangul,
  parseJson,
  slotOf,
  SourceError,
  warTimeToDate,
} from "./util";

describe("slotOf", () => {
  it("floors to the 15-minute slot in UTC", () => {
    expect(slotOf(new Date("2026-10-26T07:13:59.999Z")).toISOString()).toBe(
      "2026-10-26T07:00:00.000Z",
    );
    expect(slotOf(new Date("2026-10-26T07:28:00.000Z")).toISOString()).toBe(
      "2026-10-26T07:15:00.000Z",
    );
  });

  it("gives a call up to a minute early the next slot (clock skew)", () => {
    expect(slotOf(new Date("2026-10-26T07:14:30.000Z")).toISOString()).toBe(
      "2026-10-26T07:15:00.000Z",
    );
  });
});

describe("warTimeToDate", () => {
  it("matches the offset measured in research (dispatch #3966)", () => {
    // research/game-api.md: offset 1707940228, published 84975052 ≈ 2026-10-25T08:01:31Z (±11 s)
    const date = warTimeToDate(1707940228, 84975052);
    expect(
      Math.abs(date.getTime() - Date.parse("2026-10-25T08:01:31Z")),
    ).toBeLessThan(15_000);
  });
});

describe("hasHangul", () => {
  it("detects Korean text", () => {
    expect(hasHangul("<i=3>무기고 증강</i>")).toBe(true);
    expect(hasHangul("<i=3>ARSENAL BOOST</i>")).toBe(false);
  });
});

describe("parseJson", () => {
  const schema = z.object({ id: z.number() });

  it("returns validated data", () => {
    expect(parseJson('{"id":801}', schema, "u")).toEqual({ id: 801 });
  });

  it("throws a validation SourceError with the body excerpt", () => {
    const run = () => parseJson('{"id":"x"}', schema, "u");
    expect(run).toThrow(SourceError);
    try {
      run();
    } catch (e) {
      expect((e as SourceError).kind).toBe("validation");
      expect((e as SourceError).extra?.body).toBe('{"id":"x"}');
    }
  });

  it("treats invalid JSON as a validation error", () => {
    expect(() => parseJson("<html>", schema, "u")).toThrow(/invalid JSON/);
  });
});
