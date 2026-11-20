import * as Sentry from "@sentry/nextjs";
import { config as zodConfig } from "zod/v4/core";
import { sentryOptions } from "./lib/sentry";

// The CSP has no 'unsafe-eval'; without jitless, Zod probes `new Function` and the browser reports it.
zodConfig({ jitless: true });

Sentry.init({
  ...sentryOptions,
  // Browser network blips during Next server actions / navigations — not app bugs.
  ignoreErrors: [
    "Failed to fetch",
    "Load failed",
    "NetworkError when attempting to fetch resource.",
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
