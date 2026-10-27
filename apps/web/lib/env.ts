import { authEnvSchema } from "@workspace/auth/env";
import { dbEnvSchema } from "@workspace/db/env";
import { z } from "zod";

const envSchema = z.object({
  ...dbEnvSchema.shape,
  ...authEnvSchema.shape,
  BACKEND_URL: z.url().optional(),
  CRON_SECRET: z.string().optional(),
  SUPERADMIN_WCA_IDS: z.string().optional(),
  UPLOADTHING_TOKEN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
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
