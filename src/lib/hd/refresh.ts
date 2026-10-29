const PERIOD = 15 * 60_000;
// After the collector (~10 s) and the page warm-up have finished, with room for clock skew.
const OFFSET = 2 * 60_000;

// Milliseconds until the next refresh at slot + 2 min (:02, :17, :32, :47 UTC), A-01.
// Epoch time modulo 15 minutes lines up with the cron's UTC quarter hours.
export const refreshDelay = (now: number) =>
  (OFFSET - (now % PERIOD) + PERIOD) % PERIOD || PERIOD;
