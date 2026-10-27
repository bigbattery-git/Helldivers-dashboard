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

// Prerender without a database (CLAUDE.md): the build bakes an empty shell,
// and the first collection after deploy revalidates it with real data.
export const isBuildPhase = () =>
  process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;
