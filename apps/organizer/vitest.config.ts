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
