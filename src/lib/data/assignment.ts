import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import {
  describeReward,
  describeTask,
  type Reward,
  type Task,
  type TaskView,
} from "@/lib/hd/tasks";
import type { Point } from "@/lib/hd/series";
import { isBuildPhase, LIFE } from "./cache";

export type MajorOrder = {
  id: string;
  title: string;
  briefing: string;
  // English text behind a machine translation (ADR 0006); null for official or untranslated text.
  original: { title: string; briefing: string } | null;
  expiresAt: string;
  tasks: TaskView[];
  rewards: string[];
};

// Major orders seen in the latest assignment collection, with the latest progress (F-02).
export async function getAssignments(): Promise<MajorOrder[]> {
  "use cache";
  cacheLife(LIFE);
  cacheTag("assignment");
  if (isBuildPhase()) return [];
  const db = getDb();
  const last = await db.assignment.findFirst({
    orderBy: { lastSeenAt: "desc" },
    select: { lastSeenAt: true },
  });
  if (!last) return [];
  const [orders, planets] = await Promise.all([
    db.assignment.findMany({
      where: { lastSeenAt: last.lastSeenAt },
      orderBy: { startedAt: "asc" },
    }),
    db.planet.findMany({ select: { index: true, nameKo: true, nameEn: true } }),
  ]);
  const nameOf = new Map(planets.map((p) => [p.index, p.nameKo ?? p.nameEn]));

  return Promise.all(
    orders.map(async (o) => {
      const snap = await db.assignmentSnapshot.findFirst({
        where: { assignmentId: o.id },
        orderBy: { slot: "desc" },
      });
      const progress = (snap?.progress ?? []) as number[];
      return {
        id: o.id.toString(),
        title: o.titleKo ?? o.title,
        briefing: o.briefingKo ?? o.briefing,
        original: o.titleKo ? { title: o.title, briefing: o.briefing } : null,
        expiresAt: o.expiresAt.toISOString(),
        tasks: (o.tasks as Task[]).map((t, i) =>
          describeTask(t, progress[i] ?? 0, (index) => nameOf.get(index)),
        ),
        rewards: (o.rewards as Reward[]).map(describeReward),
      };
    }),
  );
}

export type OrderSeries = {
  id: string;
  title: string;
  tasks: { text: string; race: number | null; points: Point[] }[];
};

// Progress of each task of the current major orders over time (F-02-5).
// Tasks without a countable goal have no line.
export async function getAssignmentSeries(): Promise<OrderSeries[]> {
  "use cache";
  cacheLife(LIFE);
  cacheTag("assignment");
  if (isBuildPhase()) return [];
  const db = getDb();
  const last = await db.assignment.findFirst({
    orderBy: { lastSeenAt: "desc" },
    select: { lastSeenAt: true },
  });
  if (!last) return [];
  const orders = await db.assignment.findMany({
    where: { lastSeenAt: last.lastSeenAt },
    orderBy: { startedAt: "asc" },
  });
  return Promise.all(
    orders.map(async (o) => {
      const snaps = await db.assignmentSnapshot.findMany({
        where: { assignmentId: o.id },
        orderBy: { slot: "asc" },
      });
      const tasks = (o.tasks as Task[]).flatMap((t, i) => {
        const view = describeTask(t, 0, () => undefined);
        if (!view.goal) return [];
        const goal = view.goal;
        return [
          {
            text: view.text,
            race: view.race,
            points: snaps.map((s) => ({
              at: s.slot.toISOString(),
              value: Math.min(
                1,
                Number((s.progress as number[])[i] ?? 0) / goal,
              ),
            })),
          },
        ];
      });
      return { id: o.id.toString(), title: o.titleKo ?? o.title, tasks };
    }),
  );
}
