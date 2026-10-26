import { beforeEach, vi } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { resetFakeWca } from "./fake-wca";

vi.mock("@/lib/auth", async () => ({
  auth: (await import("./fake-wca")).fakeAuth,
}));
vi.mock("@/db/queries", async () => ({
  getCompetitionById: (await import("./fake-wca")).fakeGetCompetitionById,
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

let dataTables: string[] | null = null;

async function getDataTables(): Promise<string[]> {
  if (dataTables) return dataTables;
  const rows = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  dataTables = rows.map((row) => row.tablename);
  return dataTables;
}

beforeEach(async () => {
  resetFakeWca();
  const tables = await getDataTables();
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE ${list} RESTART IDENTITY CASCADE`));
});
