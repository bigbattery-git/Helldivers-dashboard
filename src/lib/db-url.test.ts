import { afterEach, describe, expect, it, vi } from "vitest";
import { databaseUrl, LOCAL_DATABASE_URL } from "./db-url";

describe("databaseUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses DATABASE_URL when set", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://example/db");
    expect(databaseUrl()).toBe("postgresql://example/db");
  });

  it("falls back to local Supabase outside production", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(databaseUrl()).toBe(LOCAL_DATABASE_URL);
  });

  it("throws in production when unset", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => databaseUrl()).toThrow("DATABASE_URL is not set");
  });
});
