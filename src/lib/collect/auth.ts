import { timingSafeEqual } from "node:crypto";

// Bearer check for /api/collect (ADR 0004). An unset secret rejects every call.
export function authorized(header: string | null, secret?: string) {
  if (!secret || !header) return false;
  const given = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
