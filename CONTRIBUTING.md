# Contributing

Thanks for helping with Cubing México. This guide covers what a change needs before it's merged. For setup (Node, pnpm, uv, Docker and the env files), follow [Getting Started in the README](./README.md#getting-started).

## Branches and pull requests

- Branch from `development` and open the pull request against it. `main` is production; `development` deploys to staging.
- Keep pull requests small and focused on one change.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and PR titles, with the app or package as the scope when it helps: `fix(web): ...`, `feat(organizer): ...`, `refactor(backend): ...`.

## Checks

A Husky pre-commit hook runs Prettier on staged files via lint-staged (seconds).
The full local CI suite is optional — run it yourself before a risky change or
rely on GitHub Actions on the PR:

```bash
pnpm ci:local
```

`scripts/ci-local.sh` mirrors CI: format, knip, lint, typecheck, unit tests,
migration drift, integration tests, production builds, and both Playwright e2e
suites. It needs Docker Postgres (`pnpm db:up`) and uses a dedicated
`cubing_mexico_ci` database so your local `cubing_mexico` data is left alone.
Expect several minutes. The remote `migrate` job is CI-only (it applies to
Neon). Skip the pre-commit hook only when you must with `git commit --no-verify`.

New behavior needs tests. Pure logic goes in `*.test.ts`, React components in `*.test.tsx` (jsdom and Testing Library), and anything that reads or writes Postgres in `*.integration.test.ts`.

## Database changes

`packages/db` is the only source of truth for the schema; the Flask backend uses the same tables through raw SQL.

- Generate migrations with `pnpm --filter @workspace/db generate` and commit them. CI fails when the schema and the migrations drift.
- Apps deploy independently of the `migrate` CI job, so every migration must work with both the old and the new code. Use expand/contract: add the new column or table in one PR, use it in the next, and drop the old one after that. See [docs/architecture.md](./docs/architecture.md).

## Rankings, records and event scopes

- An event is official when `events.rank < 800`. Every query that counts, ranks or compares results must apply an event scope through the shared helpers (`apps/web/lib/official-events.ts`, `events_subquery` in `apps/backend/common.py`). Never hardcode a list of event ids. The rules are in [`.cursor/rules/official-events.mdc`](./.cursor/rules/official-events.mdc).
- Unofficial results from Cubing Contests live only in the `cc_*` tables and never join scoped queries.
- Some rules exist in both TypeScript and Python (state records, nemesis). Change both and update the parity fixtures in `fixtures/parity/`.

## WCA API

Call the WCA through `wcaFetch` from `@workspace/wca`, not plain `fetch`. It adds timeouts and retries, and lets the end-to-end suites point the apps at a fake WCA server.
