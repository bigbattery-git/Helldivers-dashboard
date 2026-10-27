import * as Sentry from "@sentry/nextjs";

// Server-side error reporting only, and only when a DSN is configured (ADR 0005).
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN)
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0 });
}

export const onRequestError = Sentry.captureRequestError;
