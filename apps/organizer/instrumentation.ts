import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./lib/sentry";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/env");
    validateEnv();
  }
  Sentry.init(sentryOptions);
}

// Reports errors from Server Components, route handlers, server actions and the proxy.
export const onRequestError = Sentry.captureRequestError;
