import type { z } from "zod";

const SLOT_MS = 15 * 60 * 1000;
const USER_AGENT = "helldivers-dashboard (contact: GitHub Bigbattery)";

const CLOCK_SKEW_MS = 60 * 1000;

// Start of the 15-minute slot (UTC) for `date` (SRS v3 D-04).
// One minute of tolerance: a cron call at :15 that a lagging app clock reads as :14:59 still gets the :15 slot.
export const slotOf = (date: Date) =>
  new Date(Math.floor((date.getTime() + CLOCK_SKEW_MS) / SLOT_MS) * SLOT_MS);

// Arrowhead times are war seconds: real unix seconds = offset + war time.
export const warTimeToDate = (offsetSec: number, warTime: number) =>
  new Date((offsetSec + warTime) * 1000);

export const hasHangul = (text: string) => /[가-힣]/.test(text);

// A failed source. `extra` goes to Sentry with the error (ADR 0005).
export class SourceError extends Error {
  constructor(
    message: string,
    readonly kind: "http" | "validation",
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

export async function fetchText(
  url: string,
  headers: Record<string, string> = {},
): Promise<{ text: string; date: Date }> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, ...headers },
    // 8 s keeps the sequential Arrowhead chain (at most 6 calls) under maxDuration 60
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok)
    throw new SourceError(`HTTP ${res.status} ${url}`, "http", {
      body: text.slice(0, 2048),
    });
  const date = res.headers.get("date");
  return { text, date: date ? new Date(date) : new Date() };
}

export async function fetchJson<T>(
  url: string,
  schema: z.ZodType<T>,
  headers?: Record<string, string>,
): Promise<{ data: T; date: Date }> {
  const { text, date } = await fetchText(url, headers);
  return { data: parseJson(text, schema, url), date };
}

export function parseJson<T>(text: string, schema: z.ZodType<T>, url: string) {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new SourceError(`invalid JSON from ${url}`, "validation", {
      body: text.slice(0, 2048),
    });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success)
    throw new SourceError(`validation failed for ${url}`, "validation", {
      issues: parsed.error.issues.slice(0, 20),
      body: text.slice(0, 2048),
    });
  return parsed.data;
}
