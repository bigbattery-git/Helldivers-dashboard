import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  assignmentsSchema,
  diffEffects,
  dispatchText,
  newsFeedSchema,
  planetEventSchema,
  staticPlanetsSchema,
  statusSchema,
  warInfoSchema,
  warStatsSchema,
} from "./arrowhead";
import assignment from "./__fixtures__/assignment.json";
import newsfeed from "./__fixtures__/newsfeed.json";
import planets from "./__fixtures__/planets.json";
import stats from "./__fixtures__/stats.json";
import status from "./__fixtures__/status.json";
import warinfo from "./__fixtures__/warinfo.json";

// Fixtures are trimmed real responses from 2026-10-26, except status.planetEvents (none were live; community OpenAPI shape).
describe("schemas accept real responses", () => {
  it.each([
    ["Status", statusSchema, status],
    ["WarInfo", warInfoSchema, warinfo],
    ["Assignment", assignmentsSchema, assignment],
    ["NewsFeed", newsFeedSchema, newsfeed],
    ["Stats summary", warStatsSchema, stats],
    ["static planets", staticPlanetsSchema, planets],
  ] as const)("%s", (_, schema, fixture) => {
    expect((schema as z.ZodType).safeParse(fixture).success).toBe(true);
  });

  it("defense events", () => {
    expect(
      z.array(planetEventSchema).safeParse(status.planetEvents).success,
    ).toBe(true);
  });

  it("static planets carry the ko-KO name", () => {
    expect(staticPlanetsSchema.parse(planets)["0"].names?.["ko-KO"]).toBe(
      "슈퍼지구",
    );
  });

  it("keeps assignment progress values above int4", () => {
    const [mo] = assignmentsSchema.parse(assignment);
    expect(mo.setting.tasks[0].values).toContain(3827587060);
  });
});

describe("diffEffects", () => {
  it("starts new effects and ends missing ones", () => {
    const open = [
      { id: BigInt(1), planetIndex: 7, effectId: 100 },
      { id: BigInt(2), planetIndex: 8, effectId: 200 },
    ];
    const { started, ended } = diffEffects(open, [
      { index: 7, galacticEffectId: 100 },
      { index: 9, galacticEffectId: 300 },
    ]);
    expect(started).toEqual([{ planetIndex: 9, effectId: 300 }]);
    expect(ended.map((e) => e.id)).toEqual([BigInt(2)]);
  });

  it("does not restart an effect that stays active", () => {
    const { started, ended } = diffEffects(
      [{ planetIndex: 7, effectId: 100 }],
      [{ index: 7, galacticEffectId: 100 }],
    );
    expect(started).toEqual([]);
    expect(ended).toEqual([]);
  });
});

describe("dispatchText", () => {
  it("routes untranslated dispatches to the English column", () => {
    const [ko, en] = newsFeedSchema.parse(newsfeed);
    expect(dispatchText(ko.message)).toEqual({ bodyKo: ko.message });
    expect(dispatchText(en.message)).toEqual({ bodyEn: en.message });
  });
});
