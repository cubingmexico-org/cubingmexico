import { defineConfig } from "vitest/config";
import path from "node:path";
import { organizerTestDatabaseUrl } from "./test/database-url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**"],
    // All files share one database; running them concurrently would race on TRUNCATE.
    fileParallelism: false,
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    env: {
      // @workspace/db creates its client at import time, so this must be set before any test file loads.
      DATABASE_URL: organizerTestDatabaseUrl(),
    },
    testTimeout: 20_000,
    hookTimeout: 60_000,
    // `pnpm test:integration` writes coverage-integration/index.html and fails below these floors.
    // Raise them as integration tests are added.
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      reportsDirectory: "coverage-integration",
      include: ["app/**", "components/**", "data/**", "db/**", "lib/**"],
      exclude: ["**/*.test.{ts,tsx}", "**/*.integration.test.ts"],
      thresholds: {
        statements: 4,
        branches: 4,
        functions: 2,
        lines: 4,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
