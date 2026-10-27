import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

/**
 * Turns a caught error into a user-facing message. Next.js control-flow errors
 * (`redirect()`, `notFound()`, `unauthorized()`, ...) are rethrown so Next handles them.
 */
export function getErrorMessage(err: unknown) {
  unstable_rethrow(err);

  const unknownError = "Un error desconocido ha ocurrido. Inténtalo más tarde.";

  if (err instanceof z.ZodError) {
    const errors = err.issues.map((issue) => {
      return issue.message;
    });
    return errors.join("\n");
  }

  if (err instanceof Error) {
    return err.message;
  }

  return unknownError;
}
