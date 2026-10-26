// Supabase CLI's documented local default (`pnpm db:start`), not a secret.
export const LOCAL_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

// Pooled connection for the app. Production must set DATABASE_URL explicitly.
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production")
    throw new Error("DATABASE_URL is not set");
  return LOCAL_DATABASE_URL;
}
