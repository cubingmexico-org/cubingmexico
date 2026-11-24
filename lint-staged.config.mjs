/**
 * Prettier auto-fixes staged files on commit. Run `pnpm ci:local` manually (or
 * rely on GitHub Actions) for the full suite.
 */
export default {
  "*.{ts,tsx,js,mjs,json,css,md,yml,yaml}": "prettier --write",
};
