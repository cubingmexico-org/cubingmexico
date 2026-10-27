# Cubing México — Web Backend

Flask backend that imports World Cube Association (WCA) export data, maintains competition and competitor records (focused on Mexico), and exposes endpoints for rankings and competition data.

## Features

- Import and process official WCA TSV exports (competitions, persons, results, attempts, ranks).
- Atomic updates and corruption checks for large TSV files.
- State-level, national, sum-of-ranks, Kinch, and personal-record streak ranking computations.
- Endpoints to fetch teams, states, ranks, and competitor state info via WCA WCIF.

## Requirements

- Python 3.12 (see `.python-version`)
- [uv](https://docs.astral.sh/uv/) (dependencies are declared in `pyproject.toml` and locked in `uv.lock`)
- PostgreSQL
- Google Cloud project with Secret Manager access

## Configuration

Environment variables (see `.env.example`):

- `DB_URL` — PostgreSQL connection string (env or Secret Manager `db_url`; falls back to `postgresql://postgres:postgres@localhost:5432/cubing_mexico` only when `FLASK_ENV=development`). In production use Neon's pooled host (the one with `-pooler`); the direct host is only for running migrations.
- `CRON_SECRET` — Auth secret for admin update endpoints (env or Secret Manager `cron-secret`; the local dev token is only used when `FLASK_ENV=development`). Outside development the app refuses to start if `DB_URL` or `CRON_SECRET` can't be resolved.
- `WEB_CONCURRENCY` / `GUNICORN_THREADS` — Gunicorn workers and threads per worker in the Docker image (defaults: `4` and `8`)
- `DB_POOL_MAX` — Max pooled PostgreSQL connections per worker (default: `GUNICORN_THREADS`). Each worker has its own pool, so one instance can open up to `WEB_CONCURRENCY × DB_POOL_MAX` connections (32 with the defaults); multiply by the Cloud Run max instances when sizing the database. The total is logged at startup.
- `GCP_PROJECT_ID` — Google Cloud project id (default: `cubing-mexico`)
- `FLASK_ENV` — `development` or `production`
- `UPDATE_ALL_JOB` — Cloud Run Job resource name (`projects/P/locations/R/jobs/J`) that runs the nightly pipeline. When set, `POST /update-all` and `/update-all/resume` start an execution of it and return 202; when unset (local dev, tests) they run the pipeline inside the request.
- `WEB_URL` — Public origin of the web app (e.g. `https://www.cubingmexico.net`). After a successful `update-all`, the backend calls its `POST /api/revalidate` with `CRON_SECRET` so cached pages pick up the new data. Unset skips it.
- `JOB_FAILURE_WEBHOOK_URL` — Slack or Discord incoming-webhook URL. When a `job_runs` run (such as `update-all`) finishes as failed, the backend posts the failed step and error there. Unset disables it. Store it as a secret and expose it to the job and the service as an env var.
- `SENTRY_DSN` — Sentry project DSN for the backend. Unset keeps Sentry off (local dev, tests, CI). When set, every `log.error` / `log.exception` becomes a Sentry event (unhandled route errors, failed and interrupted `update-all` steps, social post failures); tracing is off and no request bodies, cookies, user info, query data or local variables are sent. See [`sentry_setup.py`](./sentry_setup.py).
- `SENTRY_ENVIRONMENT` — Environment name shown in Sentry, e.g. `production` or `staging` (default: `production`)
- `SOCIAL_POSTS_ENABLED` — `true` to allow Meta publishes (auto + manual admin). Keep `false` in development/staging (default: off)
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

# 2. Install Python dependencies (creates .venv, including the dev group)
uv sync

# 3. Copy environment file
cp .env.example .env

# 4. Load env and run Flask backend
set -a; source .env; set +a
uv run python app.py
```

The app will be available at `http://localhost:5000`.

## Important API endpoints

The read endpoints below are kept for external consumers and documented on the web app's public `/docs` page. The apps in this repo read Postgres directly and don't call them. Successful responses send `Cache-Control: public, max-age=3600` (`/competitor-states` uses 300, since it reads the live WCIF).

- **Competitions**
  - `GET /competitions` — List competitions (Mexico only) with pagination and filters
  - `GET /competitions/<competition_id>` — Get one competition (Mexico only) with related events, organizers, delegates, and championships
  - `GET /competitor-states/<competition_id>` — Get state info for competitors in a competition (via WCIF)

- **Teams & States**
  - `GET /teams` — List all teams
  - `GET /teams/<state_id>` — Get team by state ID
  - `GET /states` — List all states

- **Ranks & Records**
  - `GET /rank/<type>/<event_id>` — Get national ranks for a type (`single`|`average`) and event, ordered by country rank
  - `GET /rank/<state_id>/<type>/<event_id>` — Get ranks for a state, type (`single`|`average`), and event, ordered by state rank
  - Both rank routes take `page` (default 1) and `size` (default and max 1000), and return the total in an `X-Total-Count` header. They only accept official events; `?deprecated=true` also allows the deprecated ones (rank 990–999). Unknown events or states return 404, an invalid type 400.
  - `GET /records/<state_id>` — Get state records (single and average)

- **Competitors**
  - `GET /persons` — List persons (with pagination, optional state filter)
  - `GET /persons/<wca_id>` — Get person by WCA ID

- **Database & Rankings (admin/cron)**
  - `POST /update-database` — Update the full database from WCA exports, and store the export's `export_date` (`export_metadata.wca_export_date`) for the footer's WCA attribution
  - `POST /update-state-ranks` — Update state ranks
  - `POST /update-state-records` — Update historical state record markers (SR)
  - `POST /update-state-ranks/<state_id>` and `POST /update-state-records/<state_id>` — Same, for the current members of one state. The web app calls them when a team edits its roster; the records route also returns the members' `personIds` so the web can invalidate their pages. 404 for an unknown state.
  - `POST /update-sum-of-ranks` — Update sum of ranks
  - `POST /update-kinch-ranks` — Update Kinch ranks
  - `POST /update-streak-ranks` — Update personal-record streak ranks
  - `POST /update-nemesis-stats` — Recompute per-person nemesis counts (how many nemeses each competitor has and how many people they are the nemesis of)
  - `POST /update-cubing-contests` — Import unofficial-event results from the [Cubing Contests](https://cubingcontests.com/export) CSV export into the `cc_*` tables. Only `wca-comp` contests are kept (no meetups or CC-only competitions), either held in Mexico or with at least one Mexican competitor. Official WCA events are never imported: events in CC's WCA category (`category_id` 5) and events sharing an id with an official WCA event (`events.rank < 800`) are dropped. Skips when the export date is unchanged; `?force=true` re-imports. Results whose WCA competition isn't in `competitions` yet are skipped and the export is retried on the next run.
  - `POST /update-all` — Run full database import plus all derived rank updates, then the Cubing Contests import; then publish SEMANA (after state records), RACHAS and AÑO if due. The Cubing Contests import and social posts are recorded but don't fail the run. Each run and its per-step status is stored in `job_runs` and shown on the admin ops page. With `UPDATE_ALL_JOB` set it starts the Cloud Run Job and returns 202 with the execution name; otherwise it runs in the request and the response includes the steps. Returns 409 while another run started less than 3 hours ago is still `running` (older ones are marked failed as stale).
  - `POST /update-all/resume` — Resume the latest `update_all` run if it failed or crashed (a `running` row older than 3 hours, or one interrupted by SIGTERM): steps that already succeeded are skipped, and the run continues from the step that failed or was running. Returns 404 if there's nothing to resume and 409 if a run is in progress. Like `/update-all`, it starts the Cloud Run Job when `UPDATE_ALL_JOB` is set.
  - `POST /post-summary-unlock` — If Dec 20+ UTC, publish the annual summary unlock graphic (idempotent; respects `SOCIAL_POSTS_ENABLED`)
  - `POST /post-weekly-digest` — Publish the current Mexico City ISO-week SEMANA digest (idempotent; run after `/update-state-records`)
  - `POST /post-year-recap` — On Dec 31 (Mexico City, retries through Jan 2), publish the AÑO year-recap carousel with the new-year greeting (idempotent)

- **Social media (typed posts)**
  - `GET /social/media/<token>.jpg` — Short-lived public JPEG URL used by Instagram Content Publishing (unguessable token, ~10 min TTL; stored in Postgres so any Cloud Run replica can serve it)
  - RESULTADOS: `GET|POST /social/resultados/<competition_id>/{caption,image.png,publish,mark}`
  - RÉCORDS: `GET|POST /social/records/<subject_key>/{caption,image.png,publish,mark}` (`subject_key` = `{result_id}:single|average`)
  - PRÓXIMAS: `GET|POST /social/upcoming/<competition_id>/{caption,image.png,publish,mark}`
  - RESUMEN: `GET|POST /social/summary-unlock/<year>/{caption,image.png,publish,mark}`
  - AÑO: `GET|POST /social/year-recap/<year>/{caption,slides,slides/<index>/image.png,publish,mark}` (caption and slides preview any year; publish/mark only Dec 31 – Jan 2)
  - MOLLERZ: `GET|POST /social/mollerz/<subject_key>/{caption,image.png,publish,mark}` (`subject_key` = `{wca_id}:{tier}`, tier in `bronce|plata|oro|platino|opalo|diamante`)
  - `POST /social/mollerz/seed` — One-time: record every current Mollerz member's current tier as posted (`external_id = backfill`, no Meta call) so only future changes show up as pending
  - NÉMESIS: `GET|POST /social/nemesis/<wca_id>/{caption,image.png,publish,mark}`
  - `POST /social/nemesis/seed` — One-time: record every current nemesis-free competitor as posted (`external_id = backfill`, no Meta call) so only people who become nemesis-free later show up as pending
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
- sum_of_ranks, kinch_ranks, streak_ranks, nemesis_stats
- states, teams, events, export_metadata
- job_runs (per-step progress of `/update-all`, used to resume failed runs)
- social_posts (Facebook / Instagram typed post ledger: `resultados` | `record` | `upcoming` | `summary_unlock` | `weekly_digest` | `streaks_monthly` | `mollerz` | `nemesis` | `year_recap`)

## Automatic typed social posts

When `SOCIAL_POSTS_ENABLED=true`, `/update-database` can publish five graphic types to Facebook and Instagram:

| Type           | Trigger                                                                      | Dedup key                                         |
| -------------- | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| **RESULTADOS** | Mexican competition newly appears in the results set                         | `(resultados, competition_id, platform)`          |
| **RÉCORDS**    | New NR / NAR / WR marker on a Mexican person's result (incl. abroad)         | `(record, {result_id}:single\|average, platform)` |
| **PRÓXIMAS**   | Newly inserted Mexican competition with `start_date > now` and not cancelled | `(upcoming, competition_id, platform)`            |
| **RESUMEN**    | Current calendar year summaries unlocked (Dec 20 UTC onward)                 | `(summary_unlock, {year}, platform)`              |
| **MOLLERZ**    | Person becomes a Mollerz member or moves up a tier during a results import   | `(mollerz, {wca_id}:{tier}, platform)`            |
| **NÉMESIS**    | Person ends up with no nemesis during `/update-nemesis-stats` (3+ events)    | `(nemesis, {wca_id}, platform)`                   |

MOLLERZ compares a snapshot of members (people with results in every current WCA event) taken before the import with one taken after. Downgrades, which only happen when WCA adds a new event, are never posted. After the first deploy, run `POST /social/mollerz/seed` once so existing members don't show up as pending in the admin panel.

NÉMESIS compares the set of people with `nemesis_count = 0` and at least 3 events in `nemesis_stats` before and after `/update-nemesis-stats` (also run by `/update-all`). Each person is posted at most once. After the first deploy, run `POST /social/nemesis/seed` once so the current nemesis-free competitors don't show up as pending.

`/update-all` also publishes **SEMANA** (weekly digest) after state records have been recomputed, so SR totals appear on the carousel. `/update-database` does not post SEMANA on its own (the WCA import wipes `state_*_record` flags). `POST /post-weekly-digest` is the manual/retry job; run it after `/update-state-records`. `POST /post-summary-unlock` runs the same Dec 20 due-check without a WCA import (useful for Cloud Scheduler on Dec 20). **AÑO** (`year_recap`, dedup key `{year}`) is a year-in-numbers carousel for Mexican competitions starting that calendar year, closing with a "¡Feliz {year + 1}!" slide; `/update-all` and `POST /post-year-recap` publish it on Dec 31 Mexico City time, retrying through Jan 2. Each type uses a distinct 1080×1080 PIL layout (shared logo + Montserrat). Captions omit URLs on Instagram. Successes are written to `social_posts`; social failures are logged and **do not** fail the database import.

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
6. Set `SOCIAL_POSTS_ENABLED=true` on the **production** backend service only.

Keep `SOCIAL_POSTS_ENABLED=false` in development/staging (and until secrets and `PUBLIC_BASE_URL` are verified in production). Image download and “mark as posted” still work when the flag is off; only Meta API calls are skipped.

## Deployment

The backend runs on Cloud Run. A Cloud Build trigger runs [`cloudbuild.yaml`](./cloudbuild.yaml) on push; GitHub Actions doesn't deploy it. The build runs `ruff` and the unit tests before building, so a backend that fails them is never deployed, then deploys the service and points the `update-all` job at the new image.

- **Triggers:** one per branch (`main` → production, `development` → staging), each with config file `apps/backend/cloudbuild.yaml`, included files `apps/backend/**` and `packages/db/drizzle/**`, and its own `_SERVICE`, `_JOB`, `_REGION` and `_IMAGE` substitutions. To move an existing inline trigger to the file, compare it with `gcloud builds triggers describe <trigger>` first so no flag is lost.
- **Service:** keep the request timeout well above the slowest admin endpoint (the full pipeline no longer runs in a request); `gunicorn --timeout 300` in the `Dockerfile` caps how long a worker may block.
- **Configuration:** non-secret settings (`FLASK_ENV`, `GCP_PROJECT_ID`, `SOCIAL_POSTS_ENABLED`, `PUBLIC_BASE_URL`, `WEB_CONCURRENCY`, `GUNICORN_THREADS`, `DB_POOL_MAX`) are Cloud Run environment variables. `DB_URL`, `CRON_SECRET` and the Meta credentials come from Secret Manager (or an env var of the same name, which takes precedence), read by the service account at startup.
- **Error tracking:** create a Sentry project for the backend, store its DSN in Secret Manager (e.g. `sentry-dsn`) and expose it as `SENTRY_DSN` on both the service and the `update-all` job, with `SENTRY_ENVIRONMENT` set per branch: `gcloud run services update $SERVICE --region=$REGION --update-secrets=SENTRY_DSN=sentry-dsn:latest --update-env-vars=SENTRY_ENVIRONMENT=production`, and the same with `gcloud run jobs update $JOB`.
- **Cron:** Cloud Scheduler starts the nightly `update-all` Cloud Run Job (below) and calls the `/post-*` endpoints with `Authorization: Bearer $CRON_SECRET`.
- **Migrations:** the backend has no migrations of its own; it uses the Drizzle schema in `packages/db`, which CI's `migrate` job applies after checks pass. The backend deploy isn't coordinated with that job, so schema changes follow the same expand/contract rule as the web apps (see [docs/architecture.md](../../docs/architecture.md)).

### Nightly update-all (Cloud Run Job)

The pipeline can run longer than Cloud Scheduler's 30-minute limit for HTTP targets, so it runs as a Cloud Run Job built from the same image: [`run_job.py`](./run_job.py) runs `run_update_all` outside any HTTP request, exits non-zero when the run fails, and marks the run failed on SIGTERM (task timeout or cancellation) so it can be resumed.

```mermaid
flowchart LR
  scheduler[CloudScheduler] -->|"OAuth, jobs:run"| job["Cloud Run Job: run_job.py update-all"]
  ops[WebOpsPage] -->|"POST /update-all"| service[CloudRunService]
  service -->|"jobs:run, returns 202"| job
  job --> runs[(job_runs)]
  job -->|"POST /api/revalidate"| web[WebApp]
  ops -->|reads| runs
```

One-time setup (replace the variables; the job reuses the service's image, env vars and secrets):

```bash
PROJECT=cubing-mexico
REGION=us-central1            # the backend service's region
SERVICE=backend               # the backend Cloud Run service
JOB=update-all
SA=$(gcloud run services describe $SERVICE --region=$REGION --format='value(spec.template.spec.serviceAccountName)')
IMAGE=$(gcloud run services describe $SERVICE --region=$REGION --format='value(spec.template.spec.containers[0].image)')

# The job: `python run_job.py update-all`. Resumes override only the args (`update-all --resume`).
gcloud run jobs create $JOB --region=$REGION --image=$IMAGE --service-account=$SA \
  --command=python,run_job.py --args=update-all \
  --task-timeout=2h --max-retries=0 --memory=2Gi \
  --set-env-vars=FLASK_ENV=production,GCP_PROJECT_ID=$PROJECT,SOCIAL_POSTS_ENABLED=true,PUBLIC_BASE_URL=https://...,WEB_URL=https://...

# The service starts executions (POST /update-all from the ops page); resumes override the args.
gcloud run jobs add-iam-policy-binding $JOB --region=$REGION \
  --member=serviceAccount:$SA --role=roles/run.jobsExecutorWithOverrides
gcloud run services update $SERVICE --region=$REGION \
  --update-env-vars=UPDATE_ALL_JOB=projects/$PROJECT/locations/$REGION/jobs/$JOB,WEB_URL=https://...

# Nightly trigger: Cloud Scheduler calls the Cloud Run Admin API directly with an OAuth token.
gcloud scheduler jobs create http update-all-nightly --location=$REGION \
  --schedule="0 6 * * *" --time-zone=America/Mexico_City \
  --uri="https://run.googleapis.com/v2/projects/$PROJECT/locations/$REGION/jobs/$JOB:run" \
  --http-method=POST --oauth-service-account-email=$SA \
  --max-retry-attempts=0
```

Then pause or delete the old Scheduler job that POSTed to `/update-all` (it had a 20-minute attempt deadline and no retries). `jobs:run` returns as soon as the execution starts, so the default attempt deadline is enough.

- `/update-all/resume` overrides the execution's args with `["update-all", "--resume"]`, so the job's command must stay `python run_job.py` with the job name in the args.
- Keep `--task-timeout` above the longest run (`job_runs` has durations) and below the 3-hour stale threshold in `job_runs.py`.
- When the image changes, the job must be updated too (`gcloud run jobs update $JOB --image=...`); `cloudbuild.yaml` does it on every deploy.
- If a run fails or is interrupted, resume it from the admin ops page or with `gcloud run jobs execute $JOB --region=$REGION --args=update-all,--resume`.

### Monitoring and alerts

Failures reach people two ways, without any extra vendor:

- **Chat:** with `JOB_FAILURE_WEBHOOK_URL` set, every failed `update-all` run posts its failed step and error to Slack or Discord ([`notifications.py`](./notifications.py)).
- **Cloud Monitoring:** the alert policies in [`monitoring/`](./monitoring) cover a failed `update-all` execution, any `[ERROR]` log line from the service or the job, and failed Cloud Scheduler attempts (including a night where the job never started).

Create an email notification channel once, then the policies (re-run `create` after editing a file; delete the old policy first, or use `policies update` with its name):

```bash
CHANNEL=$(gcloud beta monitoring channels create --display-name="Cubing México ops" \
  --type=email --channel-labels=email_address=ops@example.com --format='value(name)')

for policy in apps/backend/monitoring/*.yaml; do
  gcloud alpha monitoring policies create --policy-from-file="$policy" --notification-channels="$CHANNEL"
done
```

The policies match the service name `backend` and the job name `update-all`; edit the filters if yours differ.

## Notes

- The app filters and stores data primarily for Mexico.
- Large TSV handling uses chunked validation and execute_values for bulk inserts.
- Corruption checks prevent partial/invalid updates; metadata prevents reprocessing older exports.

## Development

- Run checks with `pnpm lint`, `pnpm check-types` (pyright) and `pnpm test` from this directory, or through Turborepo from the repo root. They call `uv run ruff`, `pyright` and `uv run pytest`.
- Add or upgrade dependencies with `uv add <package>` / `uv lock --upgrade-package <package>`; commit `pyproject.toml` and `uv.lock` together.
- utils.py contains helpers: get_state_from_coordinates and convert_keys_to_camel_case.
- Logging uses standard Python logging at INFO level.

## License

MIT - See LICENSE for details

## Contributing

This project is maintained by Cubing México. For questions or contributions, please contact the development team.

## Acknowledgments

- World Cube Association for providing official competition data
- The Mexican cubing community
