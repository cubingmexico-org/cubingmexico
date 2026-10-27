import { defineConfig } from "vitest/config";
import path from "node:path";

const exclude = [
  "**/node_modules/**",
  "**/.next/**",
  "**/*.integration.test.ts",
];

export default defineConfig({
  // tsconfig keeps JSX for Next.js; the component tests need it compiled.
  esbuild: { jsx: "automatic" },
  test: {
    // `pnpm test` writes coverage/index.html and fails below these floors. Raise them as coverage grows;
    // most query and action code is covered by the integration suite, which isn't counted here.
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      include: ["app/**", "components/**", "db/**", "hooks/**", "lib/**"],
      exclude: ["**/*.test.{ts,tsx}", "**/*.integration.test.ts"],
      thresholds: {
        statements: 11,
        branches: 8,
        functions: 7,
        lines: 10,
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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
