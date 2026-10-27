const clamp = (x: number) => Math.min(1, Math.max(0, x));

// Liberation of an enemy-held planet: 1 - health / maxHealth (SRS v2 F-01).
export const liberation = (health: number, maxHealth: number) =>
  maxHealth > 0 ? clamp(1 - health / maxHealth) : 0;

// A defense uses the event's own HP pool (planet_event.max_health, snapshot event_health).
export const defenseProgress = (eventHealth: number, eventMaxHealth: number) =>
  liberation(eventHealth, eventMaxHealth);

type Sample = { value: number; at: Date };

// Change of a 0..1 ratio per hour between two snapshots (F-01-5); null without a time gap.
export function ratePerHour(before: Sample, after: Sample) {
  const hours = (after.at.getTime() - before.at.getTime()) / 3_600_000;
  return hours > 0 ? (after.value - before.value) / hours : null;
}
