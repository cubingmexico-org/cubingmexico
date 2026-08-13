# Organización

Cubing México organizer suite: design and export **certificates** and **badges** for WCA competitions, a read-only **Mesa** desk (staff + registrations), and **Grupos** (local group assignment draft). More ops modules planned.

Product roadmap: [`docs/organizacion-roadmap.md`](../../docs/organizacion-roadmap.md)

## Features

- Rich text certificates (TipTap + pdfmake) for podium and participation
- Badge canvas designer with ZIP / PDF export
- Tent / table-card canvas presets (inside Gafetes)
- Age and newcomer podium filters
- Cloud save/load for designs (shared with co-organizers) + template library
- Local JSON download/upload as backup
- Mesa: staff roles roster + registration overview (CSV)
- Grupos: round workspace, local WCIF draft, assignment engine, stations, CSV/JSON export (no WCA write yet)
- WCA OAuth (`manage_competitions`) via Better Auth
- Public WCIF integration + Mexico state enrichment on badges and desk

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm 10.4.1 or higher
- Neon Postgres `DATABASE_URL` (same database as `apps/web` / `@workspace/db`)

### Installation

From the monorepo root:

```bash
pnpm install
```

Copy [`apps/organizer/.env.example`](./.env.example) to `apps/organizer/.env.local` and fill in WCA OAuth, Better Auth, `API_URL`, and `DATABASE_URL`.

### Database

Organización stores designs in the shared `@workspace/db` schema (`designs` table). Apply migrations from the monorepo root (or `apps/web` scripts):

```bash
pnpm --filter @workspace/db migrate
```

Global Cubing México certificate templates are upserted automatically the first time `/api/designs/templates` is called.

### Development

```bash
# From the monorepo root
pnpm --filter organizer dev

# Or
pnpm dev:organizer
```

Open [http://localhost:3001](http://localhost:3001).

### Build

```bash
pnpm --filter organizer build
```

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript
- TipTap, pdfmake, jsPDF, Zustand, SWR, Better Auth
- Neon / Drizzle via `@workspace/db`
- Shared `@workspace/ui` and `@workspace/icons`

## Project Structure

```
apps/organizer/
├── app/
│   ├── (root)/
│   │   ├── certificates/[competitionId]/
│   │   ├── badges/[competitionId]/
│   │   ├── desk/[competitionId]/
│   │   ├── groups/[competitionId]/
│   │   └── page.tsx
│   └── api/
│       └── designs/
├── components/
├── data/
├── lib/
└── types/
```
