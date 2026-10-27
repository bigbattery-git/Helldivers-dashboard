import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import {
  describeReward,
  describeTask,
  type Reward,
  type Task,
  type TaskView,
} from "@/lib/hd/tasks";
import { isBuildPhase, LIFE } from "./cache";

export type MajorOrder = {
  id: string;
  title: string;
  briefing: string;
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
        title: o.title,
        briefing: o.briefing,
        expiresAt: o.expiresAt.toISOString(),
        tasks: (o.tasks as Task[]).map((t, i) =>
          describeTask(t, progress[i] ?? 0, (index) => nameOf.get(index)),
        ),
        rewards: (o.rewards as Reward[]).map(describeReward),
      };
    }),
  );
}
