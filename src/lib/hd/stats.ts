import type { Point } from "./series";

const HUMANS = 1;

// Share of players per enemy faction in each slot (F-04-3). Players on human-held planets
// (defenses) are left out: the snapshot does not say which attacker they fight.
export function factionShares(
  rows: { slot: string; owner: number; players: number }[],
): Record<number, Point[]> {
  const bySlot = new Map<string, Map<number, number>>();
  for (const r of rows) {
    if (r.owner === HUMANS) continue;
    const m = bySlot.get(r.slot) ?? new Map<number, number>();
    m.set(r.owner, (m.get(r.owner) ?? 0) + r.players);
    bySlot.set(r.slot, m);
  }
  const out: Record<number, Point[]> = {};
  for (const [slot, m] of [...bySlot].sort(([a], [b]) => a.localeCompare(b))) {
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    if (!total) continue;
    for (const [faction, players] of m)
      (out[faction] ??= []).push({ at: slot, value: players / total });
  }
  return out;
}

// War statistics shown on the stats page and how they read in Korean (F-04-4).
export const WAR_STATS: { key: string; label: string }[] = [
  { key: "bugKills", label: "테르미니드 처치" },
  { key: "automatonKills", label: "오토마톤 처치" },
  { key: "illuminateKills", label: "일루미닛 처치" },
  { key: "missionsWon", label: "임무 성공" },
  { key: "missionsLost", label: "임무 실패" },
  { key: "deaths", label: "헬다이버 전사" },
  { key: "friendlies", label: "아군 사살" },
];

// Growth of each counter between two war-stats snapshots.
export function statsDelta(
  latest: Record<string, unknown>,
  before: Record<string, unknown>,
) {
  return WAR_STATS.flatMap(({ key, label }) => {
    const a = Number(latest[key]);
    const b = Number(before[key]);
    return Number.isFinite(a) && Number.isFinite(b)
      ? [{ key, label, total: a, delta: a - b }]
      : [];
  });
}
