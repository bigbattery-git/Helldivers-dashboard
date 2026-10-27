import { describe, expect, it } from "vitest";
import assignment from "@/lib/collect/__fixtures__/assignment.json";
import { describeReward, describeTask, type Task } from "./tasks";

const tasks = assignment[0].setting.tasks as Task[];
const progress = assignment[0].progress;
const names = (i: number) => ({ 1: "클렌 다흐스 II" })[i];

describe("describeTask", () => {
  it("reads the live eradicate tasks (2026-10-26 MO)", () => {
    const view = describeTask(tasks[0], progress[0], names);
    expect(view.text).toBe("테르미니드 300,000,000마리 처치 (지정 무기)");
    expect(view.goal).toBe(300_000_000);
    expect(view.ratio).toBeCloseTo(31_750_269 / 300_000_000);
    expect(describeTask(tasks[1], progress[1], names).text).toMatch(
      /^일루미닛 65,000,000마리 처치/,
    );
  });

  it("names the target planet for planet tasks", () => {
    const liberate: Task = {
      type: 11,
      values: [1, 0, 1, 0, 0, 0, 2, 1],
      valueTypes: [1, 2, 3, 4, 9, 5, 11, 12],
    };
    const view = describeTask(liberate, 0, names);
    expect(view.text).toBe("클렌 다흐스 II 해방");
    expect(view.planetIndex).toBe(1);
  });

  it("falls back for unknown task types", () => {
    const view = describeTask(
      { type: 99, values: [], valueTypes: [] },
      5,
      names,
    );
    expect(view.text).toBe("알 수 없는 목표 (type 99)");
    expect(view.ratio).toBeNull();
  });
});

describe("describeReward", () => {
  it("names medals and keeps unknown types visible", () => {
    expect(describeReward({ type: 1, amount: 45 })).toBe("메달 45개");
    expect(describeReward({ type: 7, amount: 1000 })).toBe(
      "보상 (type 7) 1,000개",
    );
  });
});
