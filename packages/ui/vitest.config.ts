import { defineConfig } from "vitest/config";

const exclude = ["**/node_modules/**"];

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    // `pnpm test` writes coverage/index.html and fails below these floors. Raise them as tests are added.
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      include: ["src/**"],
      exclude: ["**/*.test.{ts,tsx}", "src/styles/**"],
      thresholds: {
        statements: 26,
        branches: 22,
        functions: 13,
        lines: 26,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude,
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          include: ["**/*.test.tsx"],
          exclude,
          setupFiles: ["./test/components-setup.ts"],
        },
      },
    ],
  },
});
