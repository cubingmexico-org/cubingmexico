import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Resolve paths relative to the @workspace/db package root. */
export function packagePath(...segments: string[]) {
  return resolve(packageRoot, ...segments);
}

/**
 * Load DATABASE_URL for local scripts. Docker/compose already sets it;
 * otherwise fall back to apps/web/.env.local or the monorepo root .env.
 */
export function loadEnv() {
  if (process.env.DATABASE_URL) return;

  config({ path: packagePath("../../apps/web/.env.local") });
  if (process.env.DATABASE_URL) return;

  config({ path: packagePath("../../.env") });
}
