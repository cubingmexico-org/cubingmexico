import { z } from "zod";

export const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  WCA_CLIENT_ID: z.string().min(1),
  WCA_CLIENT_SECRET: z.string().min(1),
  AUTH_TRUSTED_ORIGINS: z.string().optional(),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
});
