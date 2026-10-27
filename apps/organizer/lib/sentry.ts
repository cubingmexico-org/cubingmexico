import type { init } from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Shared by the browser, Node.js and edge SDKs. Sentry stays off without a DSN (local dev, CI). */
export const sentryOptions = {
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // Low because traces count against the free tier; errors are always sent.
  tracesSampleRate: 0.05,
  // Request bodies and query results can hold competitors' personal data.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpBodies: [],
    databaseQueryData: false,
    stackFrameVariables: false,
  },
} satisfies Parameters<typeof init>[0];
