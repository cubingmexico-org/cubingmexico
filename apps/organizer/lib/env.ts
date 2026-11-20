import { authEnvSchema } from "@workspace/auth/env";
import { dbEnvSchema } from "@workspace/db/env";
import { z } from "zod";

// `lib/constants.ts` treats anything other than "true"/"false" as unset, so a typo would silently fall back.
const previewModuleFlag = z.enum(["true", "false"]).optional();

const envSchema = z.object({
  ...dbEnvSchema.shape,
  ...authEnvSchema.shape,
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_WEB_URL: z.url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
  NEXT_PUBLIC_DESK_ENABLED: previewModuleFlag,
  NEXT_PUBLIC_GROUPS_ENABLED: previewModuleFlag,
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
