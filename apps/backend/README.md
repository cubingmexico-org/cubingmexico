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
- `SOCIAL_POSTS_ENABLED` — `true` to auto-post RESULTADOS, RÉCORDS, and PRÓXIMAS on WCA import (default: off)
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

- **Social media (typed posts)**
  - `GET /social/media/<token>.jpg` — Short-lived public JPEG URL used by Instagram Content Publishing (unguessable token, ~10 min TTL; stored in Postgres so any Cloud Run replica can serve it)
  - RESULTADOS: `GET|POST /social/resultados/<competition_id>/{caption,image.png,publish,mark}`
  - RÉCORDS: `GET|POST /social/records/<subject_key>/{caption,image.png,publish,mark}` (`subject_key` = `{result_id}:single|average`)
  - PRÓXIMAS: `GET|POST /social/upcoming/<competition_id>/{caption,image.png,publish,mark}`
  - All caption/image/publish/mark routes require cron auth; Superadmin UI proxies them.

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
- social_posts (Facebook / Instagram typed post ledger: `resultados` | `record` | `upcoming`)

## Automatic typed social posts

When `SOCIAL_POSTS_ENABLED=true`, `/update-database` can publish three graphic types to Facebook and Instagram:

| Type           | Trigger                                                                      | Dedup key                                         |
| -------------- | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| **RESULTADOS** | Mexican competition newly appears in the results set                         | `(resultados, competition_id, platform)`          |
| **RÉCORDS**    | New NR / NAR / WR marker on a Mexican person's result (incl. abroad)         | `(record, {result_id}:single\|average, platform)` |
| **PRÓXIMAS**   | Newly inserted Mexican competition with `start_date > now` and not cancelled | `(upcoming, competition_id, platform)`            |

Each type uses a distinct 1080×1080 PIL layout (shared logo + Montserrat). Captions omit URLs on Instagram. Successes are written to `social_posts`; social failures are logged and **do not** fail the database import.

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
5. Set `PUBLIC_BASE_URL` to the publicly reachable HTTPS origin of this backend (Meta must be able to `GET` `/social/media/<token>.jpg`). Instagram requires JPEG for `image_url`.
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
