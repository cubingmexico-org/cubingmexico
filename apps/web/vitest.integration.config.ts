import { defineConfig } from "vitest/config";
import path from "node:path";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/cubing_mexico_test";

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
      DATABASE_URL: TEST_DATABASE_URL,
      TEST_DATABASE_URL,
    },
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "server-only": path.resolve(__dirname, "./test/server-only-stub.ts"),
    },
  },
});
