# Cubing México

A Turborepo monorepo for the Cubing México ecosystem: web apps, Flask backend, shared UI, and the Postgres schema (`@workspace/db`).

## Monorepo Structure

This is a **Turborepo** monorepo managed with **pnpm workspaces**.

### Applications

- **[web](./apps/web)** - Main web application with competition management features (Next.js 16)
- **[backend](./apps/backend)** - Python Flask service for WCA TSV processing, state ranks, and computation endpoints
- **[organizer](./apps/organizer)** - Organización suite (certificates + badges today); roadmap — [`docs/organizacion-roadmap.md`](./docs/organizacion-roadmap.md)

### Packages

- **[@workspace/db](./packages/db)** - Shared Drizzle schema, migrations, and seed (source of truth for Postgres)
- **[@workspace/ui](./packages/ui)** - Shared UI component library built with shadcn/ui and Radix UI
- **[@workspace/auth](./packages/auth)** - Better Auth setup with WCA OAuth, shared by web and organizer
- **[@workspace/wca](./packages/wca)** - WCA API client (`wcaFetch`, `wcaUrl`) with timeouts and retries
- **[@workspace/icons](./packages/icons)** - Centralized icon components
- **[@workspace/eslint-config](./packages/eslint-config)** - Shared ESLint configurations
- **[@workspace/typescript-config](./packages/typescript-config)** - Shared TypeScript configurations

## Getting Started

### Prerequisites

- **Node.js** >= 24 (see `.nvmrc`)
- **pnpm** 10.34.9 (defined in `packageManager`)
- **[uv](https://docs.astral.sh/uv/)** for the Python backend (`brew install uv`); `pnpm lint`, `pnpm check-types` and `pnpm test` run the backend checks through it
- **Docker** and Docker Compose (Postgres, migrator, and Flask backend)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment files

Create `apps/web/.env.local` for the Next.js app (see `apps/web/.env.example`). Minimum for local browsing:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cubing_mexico
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=local-dev-better-auth-secret-change-me
AUTH_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:3001
```

For WCA login and uploads, also set:

```env
WCA_CLIENT_ID=...
WCA_CLIENT_SECRET=...
UPLOADTHING_TOKEN=...
```

Use the **same** `BETTER_AUTH_SECRET` (and WCA client) in `apps/organizer/.env.local` with `BETTER_AUTH_URL=http://localhost:3001`. Cookies on `localhost` are shared across ports 3000/3001.
Optional backend env: `apps/backend/.env` (see `apps/backend/.env.example`). Compose already injects `DB_URL`, `CRON_SECRET`, and related defaults.

### 3. Start Postgres, migrate, and backend

From the monorepo root:

```bash
pnpm services:up
# same as: docker compose up --build -d
```

This brings up:

| Service    | What it does                                        | URL / port              |
| ---------- | --------------------------------------------------- | ----------------------- |
| `db`       | PostgreSQL 16                                       | `localhost:5432`        |
| `migrator` | Drizzle migrate + seed (Mexican states), then exits | —                       |
| `backend`  | Flask API                                           | `http://localhost:8080` |

Check status and logs:

```bash
docker compose ps
docker compose logs migrator
docker compose logs backend --tail 50
```

Postgres-only (no backend):

```bash
pnpm db:up
pnpm --filter web db:migrate
pnpm --filter web db:seed
```

### 4. Load WCA data (optional but needed for real pages)

Schema and seed alone do not include competitions or persons. Import the WCA export via the Flask backend:

```bash
curl -X POST http://localhost:8080/update-database \
  -H "Authorization: Bearer local-dev-cron-secret-12345"
```

This download is large and can take a while. Optionally run the full ranking pipeline:

```bash
curl -X POST http://localhost:8080/update-all \
  -H "Authorization: Bearer local-dev-cron-secret-12345"
```

Smoke checks:

```bash
curl http://localhost:8080/states
curl http://localhost:8080/competitions
```

### 5. Run the web app

```bash
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000).

Other apps:

```bash
pnpm dev:organizer   # http://localhost:3001
# or all apps:
pnpm dev
```

### Stop / reset

```bash
pnpm db:down
# same as: docker compose down

# Wipe the Postgres volume for a clean migrator run:
docker compose down -v
pnpm services:up
```

## Scripts

| Command                        | Description                                            |
| ------------------------------ | ------------------------------------------------------ |
| `pnpm install`                 | Install all workspace dependencies                     |
| `pnpm services:up`             | Start db + migrator + backend via Docker Compose       |
| `pnpm db:up`                   | Start Postgres only                                    |
| `pnpm db:down`                 | Stop Compose services                                  |
| `pnpm dev:web`                 | Next.js web app (Turbo)                                |
| `pnpm dev:organizer`           | Organización app (Turbo)                               |
| `pnpm dev`                     | All apps in development mode                           |
| `pnpm build`                   | Build all apps and packages                            |
| `pnpm lint`                    | Lint all apps and packages (ruff for backend)          |
| `pnpm check-types`             | Typecheck apps and packages (pyright for backend)      |
| `pnpm test`                    | Run unit tests (web, organizer, backend pytest)        |
| `pnpm test:integration`        | Run web and backend integration tests against Postgres |
| `pnpm format`                  | Format with Prettier                                   |
| `pnpm clean`                   | Remove Turbo cache, build outputs, node_modules        |
| `pnpm --filter web db:migrate` | Apply Drizzle migrations                               |
| `pnpm --filter web db:seed`    | Seed Mexican states                                    |
| `pnpm --filter web db:studio`  | Open Drizzle Studio                                    |

## Testing

- **Unit tests:** `pnpm test` runs the Vitest suites for web, organizer and the packages, and the backend's pytest suite. No database needed. In web and organizer, `*.test.ts` files run in Node and `*.test.tsx` component tests run in jsdom with Testing Library (setup in each app's `test/components-setup.ts`).
- **Integration tests:** `pnpm db:up && pnpm test:integration` runs `apps/web/**/*.integration.test.ts` against real Postgres. The suite creates and migrates a separate `cubing_mexico_test` database and truncates its tables before every test, so your dev data is never touched. Point it elsewhere with `TEST_DATABASE_URL`; the database name must end in `_test`. Insert test data with the helpers in `apps/web/test/factories.ts`. The same command runs `apps/backend/tests_integration` (the WCA import, `/update-all` runs, the Flask state and ranking jobs, and the public read API), which recreates its own `cubing_mexico_backend_test` database from the Drizzle migrations; its helpers are in `apps/backend/tests_integration/factories.py`. It also runs the organizer's design API tests (`apps/organizer/**/*.integration.test.ts`) against their own `cubing_mexico_organizer_test` database, with the session and WCA API faked in `apps/organizer/test/fake-wca.ts`.
- **Backend:** `pnpm --filter backend test` (or `lint` / `check-types`).
- **Web smoke tests (Playwright):** `apps/web/e2e/*.spec.ts` load key pages of a production build and fail on errors. Pages are prerendered at build time, so seed first, then build: with `DATABASE_URL` pointing at a throwaway database, run `pnpm --filter @workspace/db migrate && pnpm --filter @workspace/db seed && pnpm --filter web e2e:seed`, then `pnpm --filter web build` and `pnpm --filter web test:e2e` (first time: `pnpm --filter web exec playwright install chromium`). CI runs the same steps in the `e2e` job.
- **Organizer smoke tests (Playwright):** `apps/organizer/e2e/*.spec.ts` sign in through the real Better Auth flow against a fake WCA OAuth server and API (`apps/organizer/e2e/fake-wca.ts`, started by the suite on port 4010), then download a participation certificate PDF and load the badges, groups and desk pages. With `DATABASE_URL` pointing at a migrated and seeded throwaway database, build with `WCA_ORIGIN=http://localhost:4010`, `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` set to `http://localhost:3101`, and `NEXT_PUBLIC_GROUPS_ENABLED=true NEXT_PUBLIC_DESK_ENABLED=true`, then run `pnpm --filter organizer test:e2e`. CI runs the same steps in the `e2e-organizer` job.
- **Organizer printables:** scorecards, task cards, group sheets and certificates have snapshot tests built from the WCIF in `apps/organizer/test/wcif-fixture.ts`. After an intended layout change, review the diff and update them with `pnpm --filter organizer exec vitest run -u`.
- **Security scanning:** the `CodeQL` workflow analyzes the TypeScript, Python and workflow code on every pull request and weekly. The `Dependency audit` workflow runs `pnpm audit` (production dependencies, high and critical) and `pip-audit` (backend runtime lock) weekly and on lockfile changes; it is separate from CI so a new advisory doesn't block unrelated pull requests. CodeQL results show up under Security → Code scanning. The workflow is an advanced setup, so CodeQL's default setup must stay off in Settings → Code security, or GitHub rejects the uploads.
- **TypeScript/Python parity:** state ranks and state records (SR) are computed only in `apps/backend/routes/admin/state.py` (the web calls its single-state routes after roster edits), but the SR rule also lives in `apps/web/lib/mark-state-records.ts`, which tags Cubing Contests UNR/USR. Both test suites run `fixtures/parity/state-records.json`. Nemesis counts are checked the same way: `fixtures/parity/nemesis.json` runs through the backend's `nemesis_stats` job and the web's nemesis queries in their integration suites. If you change either rule, update those fixtures so both implementations stay in sync.

## Deployment

| App             | Deployed by                                                | Gated on                                                            |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| web, organizer  | Vercel Git integration                                     | Vercel Deployment Checks (GitHub `quality`, `integration`, `build`) |
| backend         | Cloud Build trigger running `apps/backend/cloudbuild.yaml` | ruff and unit tests inside the build                                |
| database schema | CI `migrate` job                                           | every other CI job                                                  |

- **Vercel Deployment Checks:** in each Vercel project (web and organizer), open Settings → Deployment Checks and require the GitHub checks `quality`, `integration` and `build` from the `CI` workflow. Production deployments are then built as usual but only promoted to the production domain once those checks pass. Preview deployments aren't blocked.
- **Backend:** see [Deployment in the backend README](./apps/backend/README.md#deployment) for the trigger, the Cloud Run service and the nightly `update-all` job.
- **Migrations:** apps deploy independently of the `migrate` job, so every migration must work with both the old and the new code (expand/contract; see [docs/architecture.md](./docs/architecture.md)).
- **Error tracking (Sentry):** web and organizer report server errors, error boundaries and `global-error` to Sentry through `@sentry/nextjs`. Create one Sentry project per app and set these in each Vercel project:
  - `NEXT_PUBLIC_SENTRY_DSN` turns Sentry on. Without it the SDK stays off, which is how local dev and CI run.
  - `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` upload source maps during the build, for readable stack traces. The build skips the upload when the token is missing.
  - The shared options in each app's `lib/sentry.ts` keep traces at 5% and don't send request bodies, cookies, user info or database query data, since those can contain competitors' personal data.
  - The backend reports to its own Sentry project (`backend`) when `SENTRY_DSN` is set on the Cloud Run service and job; see [the backend README](./apps/backend/README.md#deployment).

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript 5.9
- **Package Manager:** pnpm
- **Build System:** Turborepo
- **UI Components:** shadcn/ui + Radix UI
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL + Drizzle ORM (`@workspace/db`)
- **Backend:** Flask (WCA import and rankings)
- **Authentication:** Better Auth via `@workspace/auth` (web + organizer)

## Working with UI Components

### Adding shadcn/ui Components

Add components to the shared UI package:

```bash
pnpm dlx shadcn@latest add button -c packages/ui
```

This places components in `packages/ui/src/components/`.

### Using UI Components

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Additional Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Backend local setup](./apps/backend/README.md)
- [Web app details](./apps/web/README.md)
- [Web hosting constraints (Vercel free tier)](./docs/web-hosting-constraints.md)
- [Architecture: which app owns what](./docs/architecture.md)
- [State records (SR) and WCA alignment](./docs/state-records.md)
- [Contributing](./CONTRIBUTING.md)

## License

The code in this repository is released under the [MIT License](./LICENSE).

The license covers the code only, not the data the apps import and show. Results from the [WCA results export](https://www.worldcubeassociation.org/export/results) remain subject to the WCA's terms, and data from the [Cubing Contests export](https://cubingcontests.com/export) is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Both sources are credited wherever their data appears.
