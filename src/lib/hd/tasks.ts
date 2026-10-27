import { formatNumber } from "./format";
import { factionOf } from "./terms";

// Major order tasks (F-02-2). Tables from helldivers-2/json (MIT), checked against live data
// in docs/research/game-api.md "해석 표 검증". Only type 3 has been seen live so far.
export type Task = { type: number; values: number[]; valueTypes: number[] };
export type Reward = { type: number; amount: number };

const VT = {
  race: 1,
  goal: 3,
  unitId: 4,
  itemId: 5,
  difficulty: 9,
  locationType: 11,
  locationIndex: 12,
};
const LOCATION_PLANET = 2;

export type TaskView = {
  text: string;
  goal: number | null;
  progress: number;
  // null when the task has no countable goal
  ratio: number | null;
  planetIndex: number | null;
};

export function describeTask(
  task: Task,
  progress: number,
  planetName: (index: number) => string | undefined,
): TaskView {
  const value = (vt: number) => {
    const i = task.valueTypes.indexOf(vt);
    return i < 0 ? undefined : task.values[i];
  };
  const goal = value(VT.goal) || null;
  const planetIndex =
    value(VT.locationType) === LOCATION_PLANET
      ? (value(VT.locationIndex) ?? null)
      : null;
  const planet = planetIndex === null ? undefined : planetName(planetIndex);
  const faction = factionOf(value(VT.race) ?? 0)?.name;
  const count = goal === null ? "" : ` ${formatNumber(goal)}`;
  // Weapon and enemy-type hashes have no name table; say that a condition exists.
  const cond = [
    value(VT.itemId) ? "지정 무기" : "",
    value(VT.unitId) ? "지정 적" : "",
  ].filter(Boolean);
  const suffix = cond.length ? ` (${cond.join(", ")})` : "";
  const where = planet ?? faction;

  const text = (() => {
    switch (task.type) {
      case 3:
        return `${faction ?? "적"}${count}마리 처치${suffix}`;
      case 11:
        return planet ? `${planet} 해방` : `행성${count}곳 해방`;
      case 12:
        return planet
          ? `${planet} 방어`
          : `${faction ?? ""} 공격${count}회 방어`.trim();
      case 13:
        return `${planet ?? "행성"} 확보 유지`;
      case 2:
        return `${where ? `${where}에서 ` : ""}추출 성공${count}회`;
      case 7:
        return `${where ? `${where}에서 ` : ""}임무 완료${count}회`;
      case 9:
        return `${where ? `${where}에서 ` : ""}작전 완료${count}회`;
      case 15:
        return `영토 확장${count}`;
      default:
        return `알 수 없는 목표 (type ${task.type})`;
    }
  })();

  return {
    text,
    goal,
    progress,
    ratio: goal ? Math.min(1, progress / goal) : null,
    planetIndex,
  };
}

const REWARD_NAMES: Record<number, string> = { 1: "메달" };

// "메달 45개" (F-02-4); unknown types keep their number visible.
export const describeReward = (r: Reward) =>
  `${REWARD_NAMES[r.type] ?? `보상 (type ${r.type})`} ${formatNumber(r.amount)}개`;
