// Front-card selection and ETA (SRS v5 U-03, U-05) and per-faction totals (F-01-4).
type FrontLike = {
  index: number;
  faction: number;
  players: number;
  progress: number;
};

const HOUR_MS = 3_600_000;
const MAX_HOURS = 24 * 365 * 10;

// Defenses always make the cut (top `n` by players if there are more), the rest fill up
// by players; the result is shown by players regardless of kind (SRS v5 U-03).
export function topFronts<T extends FrontLike & { defense: unknown }>(
  fronts: T[],
  n = 8,
): T[] {
  const byPlayers = [...fronts].sort((a, b) => b.players - a.players);
  const defenses = byPlayers.filter((f) => f.defense).slice(0, n);
  const rest = byPlayers
    .filter((f) => !f.defense)
    .slice(0, n - defenses.length);
  return [...defenses, ...rest].sort((a, b) => b.players - a.players);
}

export type FrontEta = {
  kind: "done" | "victory" | "withdraw" | "stalled" | "fail";
  // ISO time the current pace reaches 100% (victory) or 0% (withdraw)
  at: string | null;
};

// Extrapolates the hourly change from the collection slot (SRS v5 U-05, F-01-6).
export function frontEta(
  front: {
    progress: number;
    perHour: number | null;
    defense: { expiresAt: string } | null;
  },
  slot: string,
): FrontEta {
  const { progress, perHour, defense } = front;
  if (progress >= 1) return { kind: "done", at: null };
  // No hour-old slot to compare with: too early to judge either way.
  if (perHour === null) return { kind: "stalled", at: null };
  const from = new Date(slot).getTime();
  const at = (hours: number) => new Date(from + hours * HOUR_MS).toISOString();
  if (defense) {
    const hours = perHour && perHour > 0 ? (1 - progress) / perHour : Infinity;
    return from + hours * HOUR_MS < new Date(defense.expiresAt).getTime()
      ? { kind: "victory", at: at(hours) }
      : { kind: "fail", at: null };
  }
  const hours = perHour
    ? (perHour > 0 ? 1 - progress : progress) / Math.abs(perHour)
    : Infinity;
  // Beyond 10 years the pace is effectively flat (and a far date overflows `Date`).
  if (!(hours <= MAX_HOURS)) return { kind: "stalled", at: null };
  return { kind: perHour! > 0 ? "victory" : "withdraw", at: at(hours) };
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
