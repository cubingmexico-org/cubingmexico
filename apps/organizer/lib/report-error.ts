import * as Sentry from "@sentry/nextjs";

/**
 * Reports an error that is caught and handled (turned into a response, an empty
 * result or a toast). Errors that escape a request already reach Sentry through
 * `onRequestError`; caught ones only get there through this.
 */
export function reportError(
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  if (extra) {
    Sentry.captureException(error, { extra });
  } else {
    Sentry.captureException(error);
  }
  console.error(error);
}
