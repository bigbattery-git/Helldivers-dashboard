// Planet effects by galacticEffectId. Korean names are filled in with the tooltips (PR B):
// there is no official Korean source, so only ids seen live get an entry.
export type EffectKind = "environment" | "enemy" | "global";

export type Effect = { name: string; desc: string; kind: EffectKind };

export const EFFECTS: Record<number, Effect> = {};

// Unknown ids are not shown (CHECKLIST P4 "행성 요소").
export const effectOf = (id: number): Effect | undefined => EFFECTS[id];
