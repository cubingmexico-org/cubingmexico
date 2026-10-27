import { db } from "@workspace/db";
import { competition, person } from "@workspace/db/schema";
import { or, sql, type SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { accentInsensitiveContains } from "@/lib/search";

// Empty test tables always favor a sequential scan, so it's disabled to check
// that the planner can match the search expression to the trigram indexes.
async function explain(query: SQL): Promise<string> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL enable_seqscan = off`);
    const rows = await tx.execute<{ "QUERY PLAN": string }>(
      sql`EXPLAIN ${query}`,
    );
    return rows.map((row) => row["QUERY PLAN"]).join("\n");
  });
}

describe("site search trigram indexes", () => {
  it("serves person searches by name and WCA ID from the indexes", async () => {
    const plan = await explain(
      sql`SELECT ${person.wcaId} FROM ${person} WHERE ${or(
        accentInsensitiveContains(person.name, "García"),
        accentInsensitiveContains(person.wcaId, "2015garc"),
      )}`,
    );

    expect(plan).toContain("person_name_search_idx");
    expect(plan).toContain("person_wca_id_search_idx");
  });

  it("serves competition searches by name and city from the indexes", async () => {
    const plan = await explain(
      sql`SELECT ${competition.id} FROM ${competition} WHERE ${or(
        accentInsensitiveContains(competition.name, "Querétaro"),
        accentInsensitiveContains(competition.cityName, "Querétaro"),
      )}`,
    );

    expect(plan).toContain("competitions_name_search_idx");
    expect(plan).toContain("competitions_city_search_idx");
  });
});
