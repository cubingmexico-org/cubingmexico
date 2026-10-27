import { execFileSync } from "node:child_process";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { packagePath } from "./load-env";
import { MEXICAN_STATES } from "./states";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/cubing_mexico_test";

// A database of its own next to the web and backend suites, so all three can run at once.
function dbTestUrl(): { url: string; name: string } {
  const url = new URL(TEST_DATABASE_URL);
  const base = url.pathname.slice(1);
  if (!base.endsWith("_test")) {
    throw new Error(
      `Refusing to run against "${base}": the database name must end with "_test".`,
    );
  }
  const name = `${base.slice(0, -"_test".length)}_db_test`;
  url.pathname = `/${name}`;
  return { url: url.toString(), name };
}

const target = dbTestUrl();

function runScript(script: string) {
  execFileSync("tsx", [packagePath("src", script)], {
    cwd: packagePath(),
    env: { ...process.env, DATABASE_URL: target.url },
    stdio: "pipe",
  });
}

let sql: postgres.Sql;

beforeAll(async () => {
  const maintenance = new URL(TEST_DATABASE_URL);
  maintenance.pathname = "/postgres";
  const admin = postgres(maintenance.toString(), {
    max: 1,
    onnotice: () => {},
  });
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${target.name}" WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE "${target.name}"`);
  } finally {
    await admin.end();
  }
  sql = postgres(target.url, { max: 1, onnotice: () => {} });
});

afterAll(async () => {
  await sql?.end();
});

describe("migrate and seed on an empty database", () => {
  it("applies every migration", async () => {
    runScript("migrate.ts");

    const [extension] =
      await sql`SELECT 1 AS ok FROM pg_extension WHERE extname = 'pg_trgm'`;
    expect(extension?.ok).toBe(1);
    const tables =
      await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    expect(tables.map((row) => row.tablename)).toEqual(
      expect.arrayContaining(["persons", "results", "states", "social_posts"]),
    );
  });

  it("seeds the Mexican states and is safe to re-run", async () => {
    runScript("seed.ts");
    runScript("seed.ts");

    const [row] = await sql`SELECT COUNT(*)::int AS count FROM states`;
    expect(row?.count).toBe(MEXICAN_STATES.length);
  });
});
