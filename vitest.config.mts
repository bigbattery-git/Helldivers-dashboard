import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.smoke.test.ts"],
        },
      },
      // Hits real external APIs: run by hand (`pnpm test:smoke`), never in CI.
      {
        extends: true,
        test: { name: "smoke", include: ["src/**/*.smoke.test.ts"] },
      },
    ],
  },
});
