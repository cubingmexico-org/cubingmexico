import "server-only";
import { db } from "@workspace/db";
import {
  competition,
  person,
  result,
  state,
  type Event,
} from "@workspace/db/schema";
import { and, asc, count, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { accentInsensitiveContains } from "@/lib/search";
import { competitionAsOfCondition } from "@/lib/as-of-date";
import type { GetRankSinglesSchema } from "../validations";
import { countsByKey } from "./person-filter";

/** Which result column the as-of personal bests are taken from. */
export type RankColumn = "best" | "average";

function personalBestsCte(
  eventId: Event["id"],
  asOf: string,
  column: RankColumn,
) {
  const value = column === "best" ? result.best : result.average;
  return db.$with("personal_bests").as(
    db
      .select({
        personId: result.personId,
        best: sql<number>`min(${value})`.as("best"),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(
        and(
          gt(value, 0),
          eq(result.eventId, eventId),
          competitionAsOfCondition(asOf),
        ),
      )
      .groupBy(result.personId),
  );
}

/** Ranks recomputed from results up to `input.asOf`, instead of the stored ranks tables. */
export async function getAsOfRanks(
  input: GetRankSinglesSchema,
  eventId: Event["id"],
  column: RankColumn,
) {
  const offset = (input.page - 1) * input.perPage;

  const personalBests = personalBestsCte(eventId, input.asOf, column);

  const ranked = db.$with("ranked").as(
    db
      .select({
        personId: personalBests.personId,
        best: personalBests.best,
        // Explicit aliases avoid persons.name / states.name both becoming "name"
        name: sql<string | null>`${person.name}`.as("person_name"),
        gender: person.gender,
        state: sql<string | null>`${state.name}`.as("state_name"),
        countryRank:
          sql<number>`rank() over (order by ${personalBests.best} asc)`.as(
            "country_rank",
          ),
        stateRank:
          sql<number>`rank() over (partition by ${person.stateId} order by ${personalBests.best} asc)`.as(
            "state_rank",
          ),
      })
      .from(personalBests)
      .innerJoin(person, eq(personalBests.personId, person.wcaId))
      .leftJoin(state, eq(person.stateId, state.id)),
  );

  const where = and(
    input.name ? accentInsensitiveContains(ranked.name, input.name) : undefined,
    input.state.length > 0 ? inArray(ranked.state, input.state) : undefined,
    input.gender.length > 0 ? inArray(ranked.gender, input.gender) : undefined,
  );

  const orderBy =
    input.sort.length > 0
      ? input.sort.map((item) => {
          switch (item.id) {
            case "state":
              return item.desc ? desc(ranked.state) : asc(ranked.state);
            case "name":
              return item.desc ? desc(ranked.name) : asc(ranked.name);
            case "gender":
              return item.desc ? desc(ranked.gender) : asc(ranked.gender);
            case "best":
              return item.desc ? desc(ranked.best) : asc(ranked.best);
            case "countryRank":
            default:
              return item.desc
                ? desc(ranked.countryRank)
                : asc(ranked.countryRank);
          }
        })
      : [asc(ranked.countryRank)];

  const { data, total } = await db.transaction(async (tx) => {
    const data = await tx
      .with(personalBests, ranked)
      .select({
        personId: ranked.personId,
        stateRank: ranked.stateRank,
        countryRank: ranked.countryRank,
        name: ranked.name,
        best: ranked.best,
        state: ranked.state,
        gender: ranked.gender,
      })
      .from(ranked)
      .where(where)
      .orderBy(...orderBy)
      .limit(input.perPage)
      .offset(offset);

    const total = (await tx
      .with(personalBests, ranked)
      .select({ count: count() })
      .from(ranked)
      .where(where)
      .execute()
      .then((res) => res[0]?.count ?? 0)) as number;

    return { data, total };
  });

  return {
    data,
    pageCount: Math.ceil(total / input.perPage),
  };
}

export async function getAsOfStateCounts(
  eventId: Event["id"],
  asOf: string,
  column: RankColumn,
) {
  const personalBests = personalBestsCte(eventId, asOf, column);

  const rows = await db
    .with(personalBests)
    .select({ key: state.name, count: count() })
    .from(personalBests)
    .innerJoin(person, eq(personalBests.personId, person.wcaId))
    .leftJoin(state, eq(person.stateId, state.id))
    .groupBy(state.name)
    .having(gt(count(), 0))
    .orderBy(state.name);

  return countsByKey(rows);
}

export async function getAsOfGenderCounts(
  eventId: Event["id"],
  asOf: string,
  column: RankColumn,
) {
  const personalBests = personalBestsCte(eventId, asOf, column);

  const rows = await db
    .with(personalBests)
    .select({ key: person.gender, count: count() })
    .from(personalBests)
    .innerJoin(person, eq(personalBests.personId, person.wcaId))
    .groupBy(person.gender)
    .having(gt(count(), 0))
    .orderBy(person.gender);

  return countsByKey<string>(rows);
}
