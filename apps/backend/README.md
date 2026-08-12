# Cubing México — Web Backend

Flask backend that imports World Cube Association (WCA) export data, maintains competition and competitor records (focused on Mexico), and exposes endpoints for rankings and competition data.

## Features

- Import and process official WCA TSV exports (competitions, persons, results, attempts, ranks).
- Atomic updates and corruption checks for large TSV files.
- State-level, national, sum-of-ranks, Kinch, and personal-record streak ranking computations.
- Endpoints to fetch teams, states, ranks, and competitor state info via WCA WCIF.

## Requirements

- Python 3.10+
- PostgreSQL
- Google Cloud project with Secret Manager access
- pip dependencies (see requirements.txt)

## Configuration

Environment variables (see `.env.example`):

- `DB_URL` — PostgreSQL connection string (defaults to local database: `postgresql://postgres:postgres@localhost:5432/cubing_mexico`)
- `CRON_SECRET` — Auth secret for admin update endpoints
- `GCP_PROJECT_ID` — Google Cloud project id (default: `cubing-mexico`)
- `FLASK_ENV` — `development` or `production`
- `SOCIAL_POSTS_ENABLED` — `true` to auto-post RESULTADOS when new Mexican competition results are imported (default: off)
- `PUBLIC_BASE_URL` — Public HTTPS origin of this backend (required for Instagram `image_url`, e.g. `https://api.example.com`)
- `META_PAGE_ACCESS_TOKEN` — Long-lived Facebook Page access token (or Secret Manager `meta-page-access-token`)
- `FACEBOOK_PAGE_ID` — Facebook Page id (or Secret Manager `facebook-page-id`)
- `INSTAGRAM_BUSINESS_ACCOUNT_ID` — IG Business account id linked to the Page (or Secret Manager `instagram-business-account-id`)

## Local Development Setup

### Option 1: Docker Compose (Recommended)

From the **monorepo root**, Postgres schema/seed come from `@workspace/db` (Drizzle migrator), then the Flask backend starts.

```bash
# 1. Copy environment variables (monorepo root and/or apps/backend)
cp .env.example .env

# 2. Start db + migrator + backend
pnpm services:up
# same as: docker compose up --build -d

# 3. View logs
docker compose logs -f backend
```

The app will be available at `http://localhost:8080`.

Schema source of truth: [`packages/db`](../../packages/db) (`@workspace/db`). Do not maintain a separate SQL schema in this app.

### Option 2: Standalone Python + Docker Postgres

If you want to run Python directly while using PostgreSQL in Docker (from monorepo root):

```bash
# 1. Start Postgres and apply shared migrations/seed
docker compose up db migrator --build

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Copy environment file
cp .env.example .env

# 4. Run Flask backend
python app.py
```

The app will be available at `http://localhost:5000`.

## Important API endpoints

- **Competitions**
  - `GET /competitions` — List competitions (Mexico only) with pagination and filters
  - `GET /competitions/<competition_id>` — Get one competition (Mexico only) with related events, organizers, delegates, and championships
  - `GET /competitor-states/<competition_id>` — Get state info for competitors in a competition (via WCIF)

- **Teams & States**
  - `GET /teams` — List all teams
  - `GET /teams/<state_id>` — Get team by state ID
  - `GET /states` — List all states

- **Ranks & Records**
  - `GET /rank/<state_id>/<type>/<event_id>` — Get ranks for a state, type (`single`|`average`), and event
  - `GET /records/<state_id>` — Get state records (single and average)

- **Competitors**
  - `GET /persons` — List persons (with pagination, optional state filter)
  - `GET /persons/<wca_id>` — Get person by WCA ID

- **Database & Rankings (admin/cron)**
  - `POST /update-database` — Update the full database from WCA exports
  - `POST /update-state-ranks` — Update state ranks
  - `POST /update-state-records` — Update historical state record markers (SR)
  - `POST /update-sum-of-ranks` — Update sum of ranks
  - `POST /update-kinch-ranks` — Update Kinch ranks
  - `POST /update-streak-ranks` — Update personal-record streak ranks
  - `POST /update-all` — Run full database import plus all derived rank updates

- **Social media (RESULTADOS)**
  - `GET /social/media/<token>.png` — Short-lived public image URL used by Instagram Content Publishing (unguessable token, ~10 min TTL)
  - `GET /social/resultados/<competition_id>/caption` — Caption text for the post (cron auth)
  - `GET /social/resultados/<competition_id>/image.png` — Generate RESULTADOS PNG (cron auth; used by Superadmin download)
  - `POST /social/resultados/<competition_id>/publish` — Manually publish missing platforms to Facebook/Instagram (cron auth)
  - `POST /social/resultados/<competition_id>/mark` — Record a manual publish without calling Meta (cron auth)

### Competitions API

GET /competitions query params:

- page: integer, default 1
- size: integer, default 100, max 100
- stateId or state_id: filter by Mexican state id
- eventId or event_id: include competitions that contain a given event
- year: filter by start_date year
- start_date: YYYY-MM-DD, minimum competition start date
- end_date: YYYY-MM-DD, maximum competition end date
- search: case-insensitive text search over competition name and city
- cancelled: boolean (true/false, 1/0, yes/no)

GET /competitions response includes:

- pagination: page, size
- total
- items

GET /competitions/<competition_id> behavior:

- Returns the competition object with related arrays (`events`, `organizers`, `delegates`, `championships`) when the competition is in Mexico.
- Returns HTTP 200 with `{"success": false, "message": "Competition not available for Mexico"}` when the competition does not exist or is not available for Mexico.

### Persons API

GET /persons query params:

- page: integer, default 1
- size: integer, default 100, max 100
- stateId or state_id: filter by state id

GET /persons response includes:

- pagination: page, size
- total
- items

## Database (overview)

Main tables used:

- persons, competitions, results, result_attempts
- ranks_single, ranks_average
- sum_of_ranks, kinch_ranks, streak_ranks
- states, teams, events, export_metadata
- social_posts (Facebook / Instagram RESULTADOS post ledger)

## Automatic RESULTADOS social posts

When `/update-database` reloads results and one or more **Mexican** competitions appear in the results set for the first time, the backend can generate a 1080×1080 RESULTADOS graphic and publish it to the Cubing México Facebook Page and Instagram feed.

### Behavior

1. Snapshot Mexican competition IDs that already have results.
2. Replace the `results` table from the WCA export.
3. Diff the new Mexican competition IDs; for each new id, generate the image and post.
4. Record successes in `social_posts` so retries never double-post.
5. Social failures are logged and **do not** fail the database import.

Image text: `RESULTADOS` / `{competition.name}` (and `{year}` only if the name does not already end with it). Caption links to `https://cubingmexico.net/competitions/{id}/results/podiums`.

### Meta setup (before enabling)

1. Create a Meta Developer App and connect the Cubing México Facebook Page.
2. Link the Instagram Business/Creator account to that Page.
3. Obtain a **long-lived Page access token** with at least:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `instagram_basic`
   - `instagram_content_publish`
4. Store credentials (env or GCP Secret Manager):
   - `META_PAGE_ACCESS_TOKEN` / `meta-page-access-token`
   - `FACEBOOK_PAGE_ID` / `facebook-page-id`
   - `INSTAGRAM_BUSINESS_ACCOUNT_ID` / `instagram-business-account-id`
5. Set `PUBLIC_BASE_URL` to the publicly reachable HTTPS origin of this backend (Meta must be able to `GET` `/social/media/<token>.png`).
6. Set `SOCIAL_POSTS_ENABLED=true` on the backend service.

Keep `SOCIAL_POSTS_ENABLED=false` until secrets and `PUBLIC_BASE_URL` are verified.

## Notes

- The app filters and stores data primarily for Mexico.
- Large TSV handling uses chunked validation and execute_values for bulk inserts.
- Corruption checks prevent partial/invalid updates; metadata prevents reprocessing older exports.

## Development

- utils.py contains helpers: get_state_from_coordinates and convert_keys_to_camel_case.
- Logging uses standard Python logging at INFO level.

## License

MIT - See LICENSE for details

## Contributing

This project is maintained by Cubing México. For questions or contributions, please contact the development team.

## Acknowledgments

- World Cube Association for providing official competition data
- The Mexican cubing community
