import { PHASE_PRODUCTION_BUILD } from "next/constants";

// Cache tags the collector revalidates after every run (SRS v4 §3).
export const TAGS = [
  "war",
  "assignment",
  "news",
  "stats",
  "collection",
] as const;

// 15 minutes like the collector; tags refresh sooner, this is the safety net (Q-02).
export const LIFE = { stale: 300, revalidate: 900, expire: 86_400 };

// CI and local builds prerender without a database (CLAUDE.md) and bake an empty shell.
// Vercel builds (`VERCEL=1`) read the database so a fresh deploy never serves that empty shell.
export const isBuildPhase = () =>
  process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD && !process.env.VERCEL;
