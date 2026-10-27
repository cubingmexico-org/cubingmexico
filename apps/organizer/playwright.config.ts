import { defineConfig, devices } from "@playwright/test";
import { FAKE_WCA_ORIGIN, SIGNED_IN_STATE } from "./e2e/constants";

const PORT = Number(process.env.E2E_PORT ?? 3101);

/**
 * Smoke tests against a production build (`next build` first) that talks to the fake
 * WCA server in e2e/fake-wca.ts. Build and start with WCA_ORIGIN, NEXT_PUBLIC_APP_URL
 * and BETTER_AUTH_URL pointing at these ports, and with the preview modules on. See
 * the organizer README.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: "auth.setup.ts" },
    {
      name: "chromium",
      testMatch: "**/*.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: SIGNED_IN_STATE },
    },
  ],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/sign-in`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      WCA_ORIGIN: FAKE_WCA_ORIGIN,
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    },
  },
});
