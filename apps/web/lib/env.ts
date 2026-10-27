import { authEnvSchema } from "@workspace/auth/env";
import { dbEnvSchema } from "@workspace/db/env";
import { z } from "zod";

// Roster edits, admin ops and the backend's revalidation callback need these in production.
const PRODUCTION_REQUIRED = ["BACKEND_URL", "CRON_SECRET"] as const;

// An empty variable means unset, as the code reading it has always treated it.
const emptyAsUnset = (value: unknown) => (value === "" ? undefined : value);

/** Server-only variables read at request time. */
const serverEnvSchema = z.object({
  VERCEL_ENV: z.string().optional(),
  BACKEND_URL: z.preprocess(emptyAsUnset, z.url().optional()),
  CRON_SECRET: z.preprocess(emptyAsUnset, z.string().optional()),
  SUPERADMIN_WCA_IDS: z.string().optional(),
  UPLOADTHING_TOKEN: z.preprocess(emptyAsUnset, z.string().optional()),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

const envSchema = z
  .object({
    ...dbEnvSchema.shape,
    ...authEnvSchema.shape,
    ...serverEnvSchema.shape,
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
    NEXT_PUBLIC_ORGANIZER_URL: z.url().optional(),
    NEXT_PUBLIC_CARTO_API_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.VERCEL_ENV !== "production") return;
    for (const key of PRODUCTION_REQUIRED) {
      if (!env[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Required in production",
        });
      }
    }
  });

function invalid(error: z.ZodError): Error {
  return new Error(`Invalid environment variables:\n${z.prettifyError(error)}`);
}

export function validateEnv(
  env: Record<string, string | undefined> = process.env,
): void {
  const result = envSchema.safeParse(env);
  if (!result.success) throw invalid(result.error);
}

/**
 * The server-only variables, typed. Parsed on every call rather than cached, so tests can
 * stub them per test; `validateEnv` already checked them at boot.
 */
export function serverEnv(
  env: Record<string, string | undefined> = process.env,
): ServerEnv {
  const result = serverEnvSchema.safeParse(env);
  if (!result.success) throw invalid(result.error);
  return result.data;
}
