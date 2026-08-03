# Cubing México

A Turborepo monorepo for the Cubing México ecosystem: web apps, Flask backend, shared UI, and the Postgres schema (`@workspace/db`).

## Monorepo Structure

This is a **Turborepo** monorepo managed with **pnpm workspaces**.

### Applications

- **[web](./apps/web)** - Main web application with competition management features (Next.js 16)
- **[backend](./apps/backend)** - Python Flask service for WCA TSV processing, state ranks, and computation endpoints
- **[wca-certificates](./apps/wca-certificates)** - Design and print participation and podium certificates for WCA competitions

### Packages

- **[@workspace/db](./packages/db)** - Shared Drizzle schema, migrations, and seed (source of truth for Postgres)
- **[@workspace/ui](./packages/ui)** - Shared UI component library built with shadcn/ui and Radix UI
- **[@workspace/icons](./packages/icons)** - Centralized icon components
- **[@workspace/eslint-config](./packages/eslint-config)** - Shared ESLint configurations
- **[@workspace/typescript-config](./packages/typescript-config)** - Shared TypeScript configurations

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** 10.4.1 (defined in `packageManager`)
- **Docker** and Docker Compose (Postgres, migrator, and Flask backend)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment files

Copy the root template (used by Docker Compose / backend defaults):

```bash
cp .env.example .env
```

Create `apps/web/.env.local` for the Next.js app. Minimum for local browsing:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cubing_mexico
URL=http://localhost:3000
```

For WCA login and uploads, also set:

```env
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
WCA_CLIENT_ID=...
WCA_CLIENT_SECRET=...
UPLOADTHING_TOKEN=...
```

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
pnpm dev:wca-certificates
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

| Command                        | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| `pnpm install`                 | Install all workspace dependencies               |
| `pnpm services:up`             | Start db + migrator + backend via Docker Compose |
| `pnpm db:up`                   | Start Postgres only                              |
| `pnpm db:down`                 | Stop Compose services                            |
| `pnpm dev:web`                 | Next.js web app (Turbo)                          |
| `pnpm dev:wca-certificates`    | Certificates app (Turbo)                         |
| `pnpm dev`                     | All apps in development mode                     |
| `pnpm build`                   | Build all apps and packages                      |
| `pnpm lint`                    | Lint all apps and packages                       |
| `pnpm format`                  | Format with Prettier                             |
| `pnpm --filter web db:migrate` | Apply Drizzle migrations                         |
| `pnpm --filter web db:seed`    | Seed Mexican states                              |
| `pnpm --filter web db:studio`  | Open Drizzle Studio                              |

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript 5.7
- **Package Manager:** pnpm
- **Build System:** Turborepo
- **UI Components:** shadcn/ui + Radix UI
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL + Drizzle ORM (`@workspace/db`)
- **Backend:** Flask (WCA import and rankings)
- **Authentication:** Better Auth (wca-certificates), NextAuth (web)

## Working with UI Components

### Adding shadcn/ui Components

Add components to the shared UI package:

```bash
pnpm dlx shadcn@latest add button -c packages/ui
```

This places components in `packages/ui/src/components/ui/`.

### Using UI Components

```tsx
import { Button } from "@workspace/ui/components/ui/button";
```

## Additional Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Backend local setup](./apps/backend/README.md)
- [Web app details](./apps/web/README.md)
