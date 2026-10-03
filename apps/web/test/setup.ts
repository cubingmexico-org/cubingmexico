import { beforeEach, vi } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

vi.mock("next/cache", () => ({
  cacheTag: () => {},
  cacheLife: () => {},
  revalidateTag: () => {},
  revalidatePath: () => {},
  updateTag: () => {},
}));

let dataTables: string[] | null = null;

async function getDataTables(): Promise<string[]> {
  if (dataTables) return dataTables;
  const rows = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'states'`,
  );
  dataTables = rows.map((row) => row.tablename);
  return dataTables;
}

beforeEach(async () => {
  const tables = await getDataTables();
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE ${list} RESTART IDENTITY CASCADE`));
});
