import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseUrl } from "./db-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Lazy so that importing this module during `next build` needs no DATABASE_URL.
export function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    // pg waits forever by default; bound every DB call so /api/collect finishes inside maxDuration.
    const adapter = new PrismaPg({
      connectionString: databaseUrl(),
      connectionTimeoutMillis: 5_000,
      statement_timeout: 8_000,
      query_timeout: 10_000,
    });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.prisma;
}
