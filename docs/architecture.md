# Architecture

How the apps in this monorepo fit together, and which one owns each kind of work. When adding a feature, check here first so logic ends up in the right place.

```mermaid
flowchart LR
  subgraph vercel [Vercel]
    web["web (Next.js)"]
    organizer["organizer (Next.js)"]
  end

  subgraph gcp [Google Cloud]
    backend["backend (Flask, Cloud Run)"]
    scheduler[Cloud Scheduler]
    secrets[Secret Manager]
  end

  db[(Postgres)]
  wca["WCA API, export and WCIF"]
  cc["Cubing Contests export"]
  meta["Meta (Facebook and Instagram)"]
  uploadthing[UploadThing]

  web -->|Drizzle| db
  organizer -->|Drizzle| db
  backend -->|psycopg2| db

  web -->|"admin ops and social, CRON_SECRET"| backend
  organizer -->|"API_URL: teams, states"| backend
  scheduler -->|"cron jobs, CRON_SECRET"| backend
  backend --> secrets

  backend -->|"TSV export, WCIF"| wca
  backend -->|CSV export| cc
  web -->|OAuth| wca
  organizer -->|"OAuth, WCIF"| wca
  backend -->|publish posts| meta
  web -->|uploads| uploadthing
```

## Who owns what

**`@workspace/db`** ([packages/db](../packages/db))

- Single source of truth for the Postgres schema (Drizzle), migrations, and seed data.
- The Flask backend reads and writes the same tables with raw SQL. Any schema change goes through a Drizzle migration first.

**backend (Flask)** ([apps/backend](../apps/backend))

- WCA TSV export import (`/update-database`) and the full nightly pipeline (`/update-all`).
- Cubing Contests CSV export import (`/update-cubing-contests`, also run at the end of `/update-all`): unofficial events held at WCA competitions in Mexico or with Mexican competitors, stored in the `cc_*` tables.
- Bulk recomputation across all states: state ranks, state records, Kinch, sum of ranks, streaks, nemesis stats, and competition round dates (WCIF).
- Social posts: image rendering (PIL), captions, and publishing to Facebook and Instagram.
- Every mutating endpoint is protected by `require_cron_auth` (bearer `CRON_SECRET`). Cloud Scheduler calls them, and so does the web superadmin panel through `BACKEND_URL`.
- A small read API (`/teams`, `/states`, `/persons`, `/rank/...`) that the organizer app uses.

**web (Next.js)** ([apps/web](../apps/web))

- The public site: rankings, records, persons, teams, competitions, summaries, and comparisons. Reads go straight to Postgres via Drizzle with Cache Components.
- Auth via `@workspace/auth` (Better Auth + WCA OAuth), shared with the organizer app.
- Team management and superadmin server actions.
- Incremental, single-state updates when a team edits its roster: [`lib/update-state-ranks.ts`](../apps/web/lib/update-state-ranks.ts), [`lib/update-state-records.ts`](../apps/web/lib/update-state-records.ts), and `/api/update-state-ranks` / `/api/update-state-records`.
- Superadmin "ops" and social pages that proxy to the Flask backend instead of reimplementing jobs.

**organizer (Next.js)** ([apps/organizer](../apps/organizer))

- Printables (certificates, badges, scorecards), the competition desk, and groups. See [organizacion-roadmap.md](./organizacion-roadmap.md).
- Reads WCIF from the WCA, its own designs from Postgres, and teams and states from the Flask backend.

## Known duplication

State ranks and state records are computed in two places:

- **Python:** [`routes/admin/state.py`](../apps/backend/routes/admin/state.py) and `update_all.py`, for all states after each WCA import.
- **TypeScript:** `apps/web/lib/update-state-ranks.ts` and `update-state-records.ts`, for one state after roster changes.

Nemesis counts are also computed twice: [`nemesis_stats.py`](../apps/backend/nemesis_stats.py) (all pairs, fed by `update_nemesis_stats`) and `apps/web/app/(root)/persons/_lib/nemesis-queries.ts` (one person at a time).

Both sides must apply the same rules: tie handling, official events, the 9i2 effective date, and the marker hierarchy described in [state-records.md](./state-records.md). An event is official when `events.rank < 800`, matching the WCA's `Event.official`. Use the shared helpers (`apps/web/lib/official-events.ts`, `OFFICIAL_EVENTS_SUBQUERY` in `apps/backend/common.py`) rather than event id lists. When you change ranking or record logic, update both implementations.

## Event scopes

Pages that count events accept `?deprecated=true`, which switches from the `official` scope to `all` (official plus the deprecated events with rank 990-999). Unofficial events such as `fto` never count.

- State ranks and SR markers are stored for the `all` scope, and readers filter them to their scope.
- `sum_of_ranks`, `kinch_ranks`, `streak_ranks` and `nemesis_stats` store one set of rows per scope (`scope` is part of the primary key). The backend jobs in `routes/admin/rankings.py` compute both scopes on every run.

See `.cursor/rules/official-events.mdc` for the helpers to use.

## Unofficial events (Cubing Contests)

Unofficial events held at WCA competitions (FTO, Mirror Blocks, Team-Blind, and so on) come from the [Cubing Contests](https://cubingcontests.com/export) export (CC BY-SA 4.0, attributed with `CcAttribution` wherever they are shown). They live only in `cc_events`, `cc_persons`, `cc_results` and `cc_result_persons`, never in `events`, `results` or `ranks_*`, so they are outside both event scopes and never feed state ranks, records, Kinch, SOR, streaks or nemesis.

- Official WCA events are never imported from Cubing Contests (CC category 5, or an id with `events.rank < 800`).
- The site footer (`DataSourcesNotice`) credits both sources with the dates of the last imported exports (`export_metadata` keys `wca_export_date` and `cubing_contests_export_date`), as the WCA asks of sites using its export.
- `cc_persons.wca_id` has no foreign key: CC competitors may lack a WCA id or be foreigners missing from `persons`. Readers left-join `persons` to link profiles and get states.
- Team events store one `cc_result_persons` row per member. Rankings treat the sorted member set as one competitor.
- The web reads them in [`lib/cubing-contests-queries.ts`](../apps/web/lib/cubing-contests-queries.ts) and shows them on the competition results "No oficiales" tab, the person "No oficiales" tab, `/unofficial/rankings` and `/unofficial/records`. They also appear, always in their own block and never in official totals, on:
  - The competition "Eventos" tab, the "Podios" tab ("Podios no oficiales") and the "Por persona" tab (under each person).
  - The person header ("Récords personales no oficiales") and the team page ("Récords estatales no oficiales").
  - The person and team annual summaries ("Eventos no oficiales" section, excluded from share cards).
  - Links from `/records` and the rankings event selector. Rankings and records are computed on the fly from the stored results; there is no Python mirror.

## Related docs

- [state-records.md](./state-records.md): how state records are determined
- [web-hosting-constraints.md](./web-hosting-constraints.md): Vercel free-tier limits that shape `apps/web`
- [Backend README](../apps/backend/README.md): endpoints, cron jobs, and social posts
