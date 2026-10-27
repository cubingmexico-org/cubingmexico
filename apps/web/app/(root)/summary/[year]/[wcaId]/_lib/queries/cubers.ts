import "server-only";

import { db } from "@workspace/db";
import { competition, person, result } from "@workspace/db/schema";
import { asc, countDistinct, desc, eq, ne, type SQL } from "drizzle-orm";
import type { SharedCuber } from "../summary-extra";
import type { SharedCompetitionBucket } from "./types";

/** Everyone who competed at the person's competitions of the year (`yearCompFilter`), counting every event. */
export async function computeSharedCubers(
  wcaId: string,
  yearCompFilter: SQL | undefined,
): Promise<{
  sharedCubers: SharedCuber[];
  distribution: SharedCompetitionBucket[];
  repeated: number;
}> {
  const personComps = db
    .$with("person_comps")
    .as(
      db
        .selectDistinct({ competitionId: result.competitionId })
        .from(result)
        .innerJoin(competition, eq(result.competitionId, competition.id))
        .where(yearCompFilter),
    );

  const sharedRows = await db
    .with(personComps)
    .select({
      wcaId: result.personId,
      name: person.name,
      sharedCompetitions: countDistinct(result.competitionId),
    })
    .from(result)
    .innerJoin(personComps, eq(result.competitionId, personComps.competitionId))
    .innerJoin(person, eq(result.personId, person.wcaId))
    .where(ne(result.personId, wcaId))
    .groupBy(result.personId, person.name)
    .orderBy(desc(countDistinct(result.competitionId)), asc(person.name));

  const sharedCubers: SharedCuber[] = sharedRows.map((row) => ({
    wcaId: row.wcaId,
    name: row.name,
    sharedCompetitions: Number(row.sharedCompetitions),
  }));

  const distributionMap = new Map<number, number>();
  for (const cuber of sharedCubers) {
    distributionMap.set(
      cuber.sharedCompetitions,
      (distributionMap.get(cuber.sharedCompetitions) ?? 0) + 1,
    );
  }

  const distribution: SharedCompetitionBucket[] = Array.from(
    distributionMap.entries(),
  )
    .map(([sharedCompetitions, competitors]) => ({
      sharedCompetitions,
      competitors,
    }))
    .sort((a, b) => a.sharedCompetitions - b.sharedCompetitions);

  const repeated = sharedCubers.filter((c) => c.sharedCompetitions > 1).length;

  return { sharedCubers, distribution, repeated };
}
