#!/usr/bin/env bash
# Mirror the GitHub Actions CI suite locally (quality, integration, build, e2e,
# e2e-organizer). Skips the migrate job, which applies to remote Neon.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TEST_DB_URL="${TEST_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/cubing_mexico_test}"
CI_DB_URL="${CI_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/cubing_mexico_ci}"
CI_DB_NAME="cubing_mexico_ci"
TEST_DB_NAME="cubing_mexico_test"

AUTH_SECRET="ci-placeholder-secret-ci-placeholder-secret"
WCA_CLIENT_ID="ci-placeholder"
WCA_CLIENT_SECRET="ci-placeholder"

step() {
  printf '\n==> %s\n' "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

psql_docker() {
  docker compose exec -T -e PGPASSWORD=postgres db \
    psql -U postgres -v ON_ERROR_STOP=1 "$@"
}

ensure_postgres() {
  step "Postgres (docker compose)"
  require_cmd docker
  pnpm db:up
  for _ in $(seq 1 60); do
    if docker compose exec -T db pg_isready -U postgres -d cubing_mexico >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Postgres did not become ready in time." >&2
  exit 1
}

ensure_database() {
  local name="$1"
  psql_docker -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '${name}'" \
    | grep -q 1 \
    || psql_docker -d postgres -c "CREATE DATABASE ${name}"
}

reset_ci_database() {
  step "Reset ${CI_DB_NAME}"
  psql_docker -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${CI_DB_NAME}' AND pid <> pg_backend_pid();" \
    >/dev/null || true
  psql_docker -d postgres -c "DROP DATABASE IF EXISTS ${CI_DB_NAME}"
  psql_docker -d postgres -c "CREATE DATABASE ${CI_DB_NAME}"
}

migrate_and_seed() {
  DATABASE_URL="$CI_DB_URL" pnpm --filter @workspace/db migrate
  DATABASE_URL="$CI_DB_URL" pnpm --filter @workspace/db seed
}

export_ci_app_env() {
  export DATABASE_URL="$CI_DB_URL"
  export BETTER_AUTH_SECRET="$AUTH_SECRET"
  export WCA_CLIENT_ID
  export WCA_CLIENT_SECRET
}

# --- quality -----------------------------------------------------------------
step "Format"
pnpm format:check

step "Unused files and dependencies (knip)"
pnpm knip

step "Lint, typecheck and unit tests"
pnpm turbo run lint check-types test --force

step "Migration drift"
DATABASE_URL="postgresql://unused@localhost/unused" pnpm --filter @workspace/db generate
DATABASE_URL="postgresql://unused@localhost/unused" pnpm --filter @workspace/db export-columns
# Unstaged edits or untracked files mean generate/export drifted. Committed
# migration/fixture changes are fine once they are in the tree.
git diff --exit-code -- packages/db/drizzle fixtures/schema
test -z "$(git ls-files --others --exclude-standard -- packages/db/drizzle fixtures/schema)"

# --- integration / build / e2e need Postgres ---------------------------------
ensure_postgres
ensure_database "$TEST_DB_NAME"

step "Integration tests"
TEST_DATABASE_URL="$TEST_DB_URL" DATABASE_URL="$TEST_DB_URL" pnpm test:integration

step "Build"
reset_ci_database
export_ci_app_env
export BETTER_AUTH_URL="http://localhost:3000"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"
migrate_and_seed
psql_docker -d "$CI_DB_NAME" -c \
  "INSERT INTO events (id, format, name, rank) VALUES ('333', 'time', '3x3x3 Cube', 10) ON CONFLICT DO NOTHING;"
pnpm turbo run build --force

step "Web e2e"
reset_ci_database
export_ci_app_env
export BETTER_AUTH_URL="http://localhost:3100"
export NEXT_PUBLIC_APP_URL="http://localhost:3100"
export CI=1
migrate_and_seed
pnpm --filter web e2e:seed
pnpm turbo run build --filter=web --force
pnpm --filter web exec playwright install chromium
pnpm --filter web test:e2e

step "Organizer e2e"
reset_ci_database
export_ci_app_env
export BETTER_AUTH_URL="http://localhost:3101"
export NEXT_PUBLIC_APP_URL="http://localhost:3101"
export AUTH_TRUSTED_ORIGINS="http://localhost:3101"
export WCA_ORIGIN="http://localhost:4010"
export NEXT_PUBLIC_GROUPS_ENABLED="true"
export NEXT_PUBLIC_DESK_ENABLED="true"
export CI=1
migrate_and_seed
pnpm turbo run build --filter=organizer --force
pnpm --filter organizer exec playwright install chromium
pnpm --filter organizer test:e2e

printf '\n==> All local CI checks passed (migrate job is CI-only).\n'
