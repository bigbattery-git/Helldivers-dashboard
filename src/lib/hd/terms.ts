import type { CSSProperties } from "react";

// Official Korean spellings, counted in the ko-KR NewsFeed (docs/research/game-api.md, 2026-10-27).
// Screens and the machine-translation prompt share this table (ADR 0006).

export type FactionId = 1 | 2 | 3 | 4;

export const FACTIONS: Record<
  FactionId,
  { name: string; token: string | null }
> = {
  1: { name: "슈퍼지구", token: null },
  2: { name: "테르미니드", token: "terminid" },
  3: { name: "오토마톤", token: "automaton" },
  4: { name: "일루미닛", token: "illuminate" },
};

export const factionOf = (id: number) =>
  id in FACTIONS ? FACTIONS[id as FactionId] : undefined;

// CSS value for --faction (design system README "컴포넌트").
export const factionColor = (id: number) => {
  const token = factionOf(id)?.token;
  return token ? `var(--color-${token})` : "var(--color-accent)";
};

export const factionStyle = (id: number) =>
  ({ "--faction": factionColor(id) }) as CSSProperties;

// English term -> official Korean, for translation and fixed UI copy.
export const TERMS: Record<string, string> = {
  Terminids: "테르미니드",
  Automatons: "오토마톤",
  Illuminate: "일루미닛",
  "Super Earth": "슈퍼지구",
  Helldivers: "헬다이버",
  "Major Order": "주요 명령",
  "Ministry of Truth": "진리부",
  Stratagem: "스트라타젬",
  Liberation: "해방",
  Defense: "방어",
  Gloom: "글룸",
  Invasion: "침공",
};
