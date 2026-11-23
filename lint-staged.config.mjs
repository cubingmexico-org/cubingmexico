/**
 * Pre-commit gates that mirror the CI quality job's fast checks:
 * - Prettier auto-fixes staged files
 * - Typecheck packages touched by this commit
 * - Backend lint, pyright, and unit tests when backend/schema fixtures change
 * - Refresh fixtures/schema/columns.json when the Drizzle schema changes
 */
const prettier = "prettier --write";

/**
 * Map staged paths to turbo `--filter` selectors.
 * App changes typecheck that app; package changes also typecheck dependents
 * (`...pkg`) so export/signature breaks surface before push.
 */
function typecheckFilters(filenames) {
  const filters = new Set();

  for (const file of filenames) {
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
  return filenames.some(
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

export default {
  "*.{ts,tsx,js,mjs,json,css,md,yml,yaml}": prettier,
  "{apps,packages}/**/*.{ts,tsx}": (filenames) => {
    const filters = typecheckFilters(filenames);
    if (filters.length === 0) return [];
    return `pnpm turbo run check-types ${filters.map((f) => `--filter=${f}`).join(" ")}`;
  },
  // Route-map snapshots, schema column writes, and related unit checks.
  "{apps/backend/**,fixtures/schema/**,packages/db/src/schema.ts}":
    backendQualityCommands,
};
