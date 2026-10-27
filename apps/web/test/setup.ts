import { afterEach, beforeEach, vi } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { resetSession } from "./session";

vi.mock("next/cache", () => ({
  cacheTag: () => {},
  cacheLife: () => {},
  revalidateTag: () => {},
  revalidatePath: () => {},
  updateTag: () => {},
}));
vi.mock("@/lib/auth", async () => ({
  auth: (await import("./session")).fakeAuth,
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
// Outside a Next.js server, unauthorized() throws "authInterrupts not enabled" instead of its 401 error.
vi.mock("next/navigation", async (importOriginal) => {
  const { unauthorizedError } = await import("./session");
  return {
    ...(await importOriginal<typeof import("next/navigation")>()),
    unauthorized: () => {
      throw unauthorizedError();
    },
  };
});

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
  resetSession();
  const tables = await getDataTables();
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE ${list} RESTART IDENTITY CASCADE`));
});

afterEach(() => {
  vi.unstubAllEnvs();
});
