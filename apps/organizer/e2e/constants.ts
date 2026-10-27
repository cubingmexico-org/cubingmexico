// Shared with playwright.config.ts, which tools such as knip load without the `@/` alias.

export const FAKE_WCA_PORT = 4010;
export const FAKE_WCA_ORIGIN = `http://localhost:${FAKE_WCA_PORT}`;

export const SIGNED_IN_STATE = "e2e/.auth/organizer.json";
