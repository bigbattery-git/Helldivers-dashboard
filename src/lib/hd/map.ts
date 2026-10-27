// Galaxy map geometry (design system README "지도와 PlanetMarker").
// Planet positions are -1..1 with Super Earth at 0,0 and y pointing up
// (Automaton space has positive y, the Illuminate negative: checked 2026-10-27).

export const toMapPercent = (x: number, y: number) => ({
  left: ((x + 1) / 2) * 100,
  top: ((1 - y) / 2) * 100,
});

// Planets right of 60% put their label and tooltip on the left.
export const flipsLeft = (leftPercent: number) => leftPercent > 60;

type Labelled = { index: number; players: number; defense: unknown };

// Only some planets get a name on the map so labels do not pile up (SRS v4 §9).
export function labelledPlanets(
  fronts: Labelled[],
  moTargets: ReadonlySet<number>,
  topByPlayers = 5,
) {
  const top = [...fronts]
    .sort((a, b) => b.players - a.players)
    .slice(0, topByPlayers)
    .map((f) => f.index);
  return new Set([
    ...top,
    ...fronts
      .filter((f) => moTargets.has(f.index) || f.defense)
      .map((f) => f.index),
  ]);
}
