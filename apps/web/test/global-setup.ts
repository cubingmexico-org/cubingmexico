import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { state } from "@workspace/db/schema";
import { MEXICAN_STATES } from "@workspace/db/states";

const MIGRATIONS_FOLDER = path.resolve(
  __dirname,
  "../../../packages/db/drizzle",
);

function getTestDatabaseUrl(): string {
  const url =
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/cubing_mexico_test";
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `Refusing to run integration tests against "${dbName}": the database name must end with "_test" because every table is truncated.`,
    );
  }
  return url;
}

async function ensureDatabaseExists(url: string) {
  const target = new URL(url);
  const dbName = target.pathname.slice(1);
  const maintenance = new URL(url);
  maintenance.pathname = "/postgres";

  const admin = postgres(maintenance.toString(), { max: 1, onnotice: () => {} });
  try {
    const rows =
      await admin`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (rows.length === 0) {
      await admin.unsafe(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await admin.end();
  }
}

export default async function setup() {
  const url = getTestDatabaseUrl();
  await ensureDatabaseExists(url);

  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    await db.insert(state).values(MEXICAN_STATES).onConflictDoNothing();
  } finally {
    await client.end();
  }
}
