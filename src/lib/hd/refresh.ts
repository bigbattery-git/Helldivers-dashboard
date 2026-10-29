const PERIOD = 15 * 60_000;
// After the collector (~10 s) and the page warm-up have finished, with room for clock skew.
const OFFSET = 2 * 60_000;

// True once the current slot's collection should be on screen (slot + 2 min) but the page
// still shows an older run (SRS v6 A-01). Epoch time modulo 15 minutes matches the cron's UTC quarter hours.
export function behind(startedAt: string | null, now: number) {
  const slot = now - (now % PERIOD);
  return now - slot >= OFFSET && (!startedAt || Date.parse(startedAt) < slot);
}
