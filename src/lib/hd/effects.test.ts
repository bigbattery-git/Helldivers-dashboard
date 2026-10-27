import { expect, it } from "vitest";
import { tooltipEffects } from "./effects";

it("shows environment and enemy effects once each, hiding facilities and unknown ids", () => {
  // 1202/1203: Jet Brigade twice, 1232: factory hub, 1188: dense gloom, 9999: unknown
  expect(
    tooltipEffects([1202, 1203, 1232, 1188, 9999]).map((e) => e.name),
  ).toEqual(["제트 여단", "짙은 글룸"]);
});
