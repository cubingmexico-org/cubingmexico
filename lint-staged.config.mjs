/**
 * Pre-commit gates that mirror the CI quality job's fast checks:
 * - Prettier auto-fixes staged files
 * - Lint, typecheck, and unit tests for packages touched by this commit
 * - Backend lint, pyright, and unit tests when backend/schema fixtures change
 * - Refresh fixtures/schema/columns.json when the Drizzle schema changes
 *
 * Uses turbo `--force` so a stale remote/local cache cannot mask failures.
 * Integration / e2e / knip / migration generate still only run in CI.
 *
 * lint-staged passes absolute paths by default (`--relative` is opt-in), so
 * every path check normalizes to the repo-relative form first.
 */
import path from "node:path";

const prettier = "prettier --write";

function toRepoRelative(file) {
  return path.isAbsolute(file) ? path.relative(process.cwd(), file) : file;
}

/**
 * Map staged paths to turbo `--filter` selectors.
 * App changes check that app; package changes also check dependents
 * (`...pkg`) so export/signature breaks surface before push.
 */
function packageFilters(filenames) {
  const filters = new Set();

  for (const file of filenames.map(toRepoRelative)) {
    if (file.startsWith("apps/web/")) filters.add("web");
    else if (file.startsWith("apps/organizer/")) filters.add("organizer");
    else if (file.startsWith("packages/db/")) filters.add("...@workspace/db");
    else if (file.startsWith("packages/auth/")) {
      filters.add("...@workspace/auth");
    } else if (file.startsWith("packages/ui/")) filters.add("...@workspace/ui");
    else if (file.startsWith("packages/wca/")) filters.add("...@workspace/wca");
    else if (file.startsWith("packages/icons/")) {
      filters.add("...@workspace/icons");
    } else if (file.startsWith("packages/next-config/")) {
      filters.add("...@workspace/next-config");
    } else if (file.startsWith("packages/public-api/")) {
      filters.add("...@workspace/public-api");
    }
  }

  return [...filters];
}

function schemaSourceTouched(filenames) {
  return filenames
    .map(toRepoRelative)
    .some(
      (file) =>
        file === "packages/db/src/schema.ts" ||
        file.startsWith("packages/db/src/schema/"),
    );
}

function backendQualityCommands(filenames) {
  const commands = [];

  if (schemaSourceTouched(filenames)) {
    // Same fixture CI's migration-drift step regenerates; stage it like Prettier.
    commands.push(
      "pnpm --filter @workspace/db export-columns && git add fixtures/schema/columns.json",
    );
  }

  commands.push(
    "pnpm --filter backend lint",
    "pnpm --filter backend check-types",
    "pnpm --filter backend test",
  );

  return commands;
}

function packageQualityCommands(filenames) {
  const filters = packageFilters(filenames);
  if (filters.length === 0) return [];
  const filterArgs = filters.map((f) => `--filter=${f}`).join(" ");
  return `pnpm turbo run lint check-types test ${filterArgs} --force`;
}

export default {
  "*.{ts,tsx,js,mjs,json,css,md,yml,yaml}": prettier,
  "{apps,packages}/**/*.{ts,tsx}": packageQualityCommands,
  // Route-map snapshots, schema column writes, and related unit checks.
  "{apps/backend/**,fixtures/schema/**,packages/db/src/schema.ts}":
    backendQualityCommands,
};
