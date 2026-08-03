"use cache";

import "server-only";
import { db } from "@workspace/db";
import { person, competition, result } from "@workspace/db/schema";
import { count, lt, eq, and, countDistinct } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

export async function getNumberOfPersons() {
  cacheLife("days");
  cacheTag("number-of-persons");

  try {
    const total = (await db
      .select({
        count: countDistinct(person.wcaId),
      })
      .from(person)
      .innerJoin(result, and(eq(person.wcaId, result.personId)))
      .innerJoin(competition, and(eq(competition.id, result.competitionId)))
      .where(and(eq(competition.countryId, "Mexico")))
      .execute()
      .then((res) => res[0]?.count ?? 0)) as number;

    return total;
  } catch (err) {
    console.error(err);
    return 0;
  }
}

export async function getNumberOfCompetitions() {
  cacheLife("days");
  cacheTag("number-of-competitions");

  try {
    const total = (await db
      .select({
        count: count(),
      })
      .from(competition)
      .where(
        and(
          eq(competition.countryId, "Mexico"),
          lt(competition.endDate, new Date()),
        ),
      )
      .execute()
      .then((res) => res[0]?.count ?? 0)) as number;

    return total;
  } catch (err) {
    console.error(err);
    return 0;
  }
}
