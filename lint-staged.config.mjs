/**
 * Prettier auto-fixes staged files before the full local CI suite
 * (`pnpm ci:local` in `.husky/pre-commit`) runs.
 */
export default {
  "*.{ts,tsx,js,mjs,json,css,md,yml,yaml}": "prettier --write",
};
