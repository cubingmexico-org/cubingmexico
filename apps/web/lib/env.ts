import { authEnvSchema } from "@workspace/auth/env";
import { dbEnvSchema } from "@workspace/db/env";
import { z } from "zod";

// Roster edits, admin ops and the backend's revalidation callback need these in production.
const PRODUCTION_REQUIRED = ["BACKEND_URL", "CRON_SECRET"] as const;

const envSchema = z
  .object({
    ...dbEnvSchema.shape,
    ...authEnvSchema.shape,
    VERCEL_ENV: z.string().optional(),
    BACKEND_URL: z.url().optional(),
    CRON_SECRET: z.string().min(1).optional(),
    SUPERADMIN_WCA_IDS: z.string().optional(),
    UPLOADTHING_TOKEN: z.string().optional(),
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

export function validateEnv(
  env: Record<string, string | undefined> = process.env,
): void {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
}
