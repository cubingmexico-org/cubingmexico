# Cubing México — Web Backend

Flask backend that imports World Cube Association (WCA) export data, maintains competition and competitor records (focused on Mexico), and exposes endpoints for rankings and competition data.

## Features

- Import and process official WCA TSV exports (competitions, persons, results, attempts, ranks).
- Atomic updates and corruption checks for large TSV files.
- State-level, national, sum-of-ranks and Kinch ranking computations.
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

## Local Development Setup

### Option 1: Docker Compose (Recommended)

Runs PostgreSQL container and Flask backend together with pre-loaded schema and seed data.

```bash
# 1. Copy environment variables file
cp .env.example .env

# 2. Start services
docker compose up --build -d

# 3. View logs
docker compose logs -f web
```

The app will be available at `http://localhost:8080`.

### Option 2: Standalone Python + Docker Postgres

If you want to run Python directly while using PostgreSQL in Docker:

```bash
# 1. Start only the PostgreSQL database container
docker compose up db -d

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
  - `POST /update-sum-of-ranks` — Update sum of ranks
  - `POST /update-kinch-ranks` — Update Kinch ranks

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
- sum_of_ranks, kinch_ranks
- states, teams, events, export_metadata

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
