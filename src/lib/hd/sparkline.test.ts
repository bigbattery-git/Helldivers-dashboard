import { expect, it } from "vitest";
import { sparkline } from "./sparkline";

it("maps values to an SVG path with the min at the bottom", () => {
  expect(sparkline([10, 30, 20], 100, 20)).toEqual({
    path: "M0,20L50,0L100,10",
    min: 10,
    max: 30,
  });
  // A flat series sits on the baseline instead of dividing by zero.
  expect(sparkline([5, 5], 10, 4)?.path).toBe("M0,4L10,4");
  expect(sparkline([1], 10, 4)).toBeNull();
});
