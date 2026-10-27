// Defense tooltip figures that the API does not give directly (SRS v4 §9).

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

// The enemy's side of a defense: how much of the event's time has passed, 0..1.
export function enemyProgress(startedAt: Date, expiresAt: Date, now: Date) {
  const span = expiresAt.getTime() - startedAt.getTime();
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - startedAt.getTime()) / span));
}

// Whether the current pace reaches 100% before the event ends (F-01-6).
// null without a pace to judge from.
export function defenseOutlook(
  progress: number,
  perHour: number | null,
  expiresAt: Date,
  now: Date,
) {
  if (progress >= 1) return { good: true, text: "방어 성공" };
  if (perHour === null) return null;
  const hoursLeft = (expiresAt.getTime() - now.getTime()) / HOUR_MS;
  if (hoursLeft <= 0) return { good: false, text: "위험 · 시간 초과" };
  const needed = (1 - progress) / hoursLeft;
  return perHour >= needed
    ? { good: true, text: "우세 · 방어 성공 예상" }
    : { good: false, text: "위험 · 속도 부족" };
}

// "DAY 1,024": days since the war season started, counting the first day as 1.
export const warDay = (startedAt: Date, at: Date) =>
  Math.floor((at.getTime() - startedAt.getTime()) / DAY_MS) + 1;
