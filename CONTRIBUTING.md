# Contributing

Thanks for helping with Cubing México. This guide covers what a change needs before it's merged. For setup (Node, pnpm, uv, Docker and the env files), follow [Getting Started in the README](./README.md#getting-started).

## Branches and pull requests

- Branch from `development` and open the pull request against it. `main` is production; `development` deploys to staging.
- Keep pull requests small and focused on one change.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and PR titles, with the app or package as the scope when it helps: `fix(web): ...`, `feat(organizer): ...`, `refactor(backend): ...`.

## Checks

CI runs these on every pull request. Run them locally first:

```bash
pnpm format:check
pnpm knip
pnpm turbo run lint check-types test
```

Run the slower suites when your change touches what they cover:

- **Integration tests** (queries, server actions, backend jobs): `pnpm db:up && pnpm test:integration`. They use their own `*_test` databases, so your dev data is safe.
- **End-to-end smoke tests** (pages, navigation, sign-in, printables): see [Testing in the README](./README.md#testing) for the web and organizer Playwright suites.

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
