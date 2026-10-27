import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { organizerTestDatabaseUrl } from "./database-url";

const MIGRATIONS_FOLDER = path.resolve(
  __dirname,
  "../../../packages/db/drizzle",
);

async function ensureDatabaseExists(url: string) {
  const dbName = new URL(url).pathname.slice(1);
  const maintenance = new URL(url);
  maintenance.pathname = "/postgres";

  const admin = postgres(maintenance.toString(), {
    max: 1,
    onnotice: () => {},
  });
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
  const url = organizerTestDatabaseUrl();
  await ensureDatabaseExists(url);

  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await client.end();
  }
}
