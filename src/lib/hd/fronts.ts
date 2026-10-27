// Ordering and per-faction totals for the active-front list (F-01-2, F-01-4).
type FrontLike = {
  index: number;
  faction: number;
  players: number;
  progress: number;
};

export type FrontSort = "default" | "progress" | "faction";

export const FRONT_SORTS: { value: FrontSort; label: string }[] = [
  { value: "default", label: "주요 명령 · 인원" },
  { value: "progress", label: "진행도" },
  { value: "faction", label: "진영" },
];

// Default: major-order targets first, then by players (SRS v2 F-01-2).
export function sortFronts<T extends FrontLike>(
  fronts: T[],
  sort: FrontSort,
  moTargets: ReadonlySet<number>,
): T[] {
  const byPlayers = (a: T, b: T) => b.players - a.players;
  const order = {
    default: (a: T, b: T) =>
      Number(moTargets.has(b.index)) - Number(moTargets.has(a.index)) ||
      byPlayers(a, b),
    progress: (a: T, b: T) => b.progress - a.progress || byPlayers(a, b),
    faction: (a: T, b: T) => a.faction - b.faction || byPlayers(a, b),
  }[sort];
  return [...fronts].sort(order);
}

export function factionSummary(fronts: FrontLike[]) {
  const by = new Map<
    number,
    { faction: number; fronts: number; players: number }
  >();
  for (const f of fronts) {
    const s = by.get(f.faction) ?? {
      faction: f.faction,
      fronts: 0,
      players: 0,
    };
    s.fronts += 1;
    s.players += f.players;
    by.set(f.faction, s);
  }
  return [...by.values()].sort((a, b) => a.faction - b.faction);
}
