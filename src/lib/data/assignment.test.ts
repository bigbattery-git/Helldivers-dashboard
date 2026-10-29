import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { currentOrders } from "./assignment";

const order = { id: BigInt(1), lastSeenAt: new Date("2026-10-30T09:00:00Z") };

// The last ok run, as the collection_run JSON filter would return it.
function fakeDb(lastOk: Date | null) {
  return {
    collectionRun: {
      findFirst: async () => (lastOk ? { startedAt: lastOk } : null),
    },
    assignment: {
      findMany: async ({ where }: { where: { lastSeenAt: Date } }) =>
        [order].filter(
          (o) => o.lastSeenAt.getTime() === where.lastSeenAt.getTime(),
        ),
    },
  } as unknown as PrismaClient;
}

describe("currentOrders", () => {
  it("returns the orders the last ok run saw", async () => {
    // Cron calls land a few seconds into the slot.
    const db = fakeDb(new Date("2026-10-30T09:00:04Z"));
    expect(await currentOrders(db)).toEqual([order]);
  });

  it("drops an ended order once a run sees no orders", async () => {
    const db = fakeDb(new Date("2026-10-30T09:15:03Z"));
    expect(await currentOrders(db)).toEqual([]);
  });

  it("returns nothing before any ok run", async () => {
    expect(await currentOrders(fakeDb(null))).toEqual([]);
  });
});
