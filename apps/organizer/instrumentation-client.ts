import * as Sentry from "@sentry/nextjs";
import { config as zodConfig } from "zod/v4/core";
import { sentryOptions } from "./lib/sentry";

// The CSP has no 'unsafe-eval'; without jitless, Zod probes `new Function` and the browser reports it.
zodConfig({ jitless: true });

Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
