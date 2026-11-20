import { beforeEach, vi } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { resetFakeWca } from "./fake-wca";

vi.mock("@/lib/auth", async () => ({
  auth: (await import("./fake-wca")).fakeAuth,
}));
vi.mock("@/db/queries", async () => {
  const fake = await import("./fake-wca");
  return {
    getCompetitionById: fake.fakeGetCompetitionById,
    getWCIFByCompetitionId: fake.fakeGetWCIFByCompetitionId,
  };
});
vi.mock("@/lib/wca-wcif", async () => {
  const fake = await import("./fake-wca");
  return {
    requireWcaAccessToken: async () => {
      const token = await fake.fakeAuth.api.getAccessToken();
      if (!token?.accessToken) {
        throw new Error(
          "No se pudo obtener el token de WCA. Cierra sesión y vuelve a entrar con permisos de manage_competitions.",
        );
      }
      return token.accessToken;
    },
    getAuthorizedWcif: async (competitionId: string) => {
      const wcif = await fake.fakeGetWCIFByCompetitionId({ competitionId });
      if (!wcif) {
        throw new Error(`No se pudo cargar el WCIF autorizado (404)`);
      }
      return wcif;
    },
    checkWcif: async () => ({ ok: true as const }),
    patchWcif: async () => ({ ok: true as const }),
  };
});
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
