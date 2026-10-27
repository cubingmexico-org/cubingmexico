import { defineConfig } from "vitest/config";
import path from "node:path";

const exclude = [
  "**/node_modules/**",
  "**/.next/**",
  "**/e2e/**",
  "**/*.integration.test.ts",
];

export default defineConfig({
  // tsconfig keeps JSX for Next.js; the component tests need it compiled.
  esbuild: { jsx: "automatic" },
  test: {
    // Printables format dates in the process timezone; snapshots must not depend on the machine.
    env: { TZ: "UTC" },
    // Report only; no thresholds. `pnpm test:coverage` writes coverage/index.html.
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      include: ["app/**", "components/**", "data/**", "db/**", "lib/**"],
      exclude: ["**/*.test.{ts,tsx}", "**/*.integration.test.ts"],
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
