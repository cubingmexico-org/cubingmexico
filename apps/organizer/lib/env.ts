import { authEnvSchema } from "@workspace/auth/env";
import { dbEnvSchema } from "@workspace/db/env";
import { z } from "zod";

const envSchema = z.object({
  ...dbEnvSchema.shape,
  ...authEnvSchema.shape,
  API_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
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
