import { defineConfig } from "prisma/config";
import { LOCAL_DATABASE_URL } from "./src/lib/db-url";

// Prisma 7 no longer loads env files; pick up `vercel env pull` output when present.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Direct (non-pooled) URL for migrations. Never throws, so `prisma generate` on install needs no env.
  // `||`: a key copied empty from .env.example means unset, as in db-url.ts.
  datasource: { url: process.env.DIRECT_URL || LOCAL_DATABASE_URL },
});
