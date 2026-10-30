// Defense tooltip figures that the API does not give directly (SRS v4 §9).

const DAY_MS = 86_400_000;

// The enemy's side of a defense: how much of the event's time has passed, 0..1.
export function enemyProgress(startedAt: Date, expiresAt: Date, now: Date) {
  const span = expiresAt.getTime() - startedAt.getTime();
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - startedAt.getTime()) / span));
}

// "DAY 1,024": days since the war season started, counting the first day as 1.
export const warDay = (startedAt: Date, at: Date) =>
  Math.floor((at.getTime() - startedAt.getTime()) / DAY_MS) + 1;
