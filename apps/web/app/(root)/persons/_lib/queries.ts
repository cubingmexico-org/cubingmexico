"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  state,
  person,
  type State,
  result,
  competition,
} from "@workspace/db/schema";
import {
  and,
  count,
  gt,
  eq,
  desc,
  asc,
  inArray,
  countDistinct,
  sql,
} from "drizzle-orm";
import { accentInsensitiveContains } from "@/lib/search";
import { type GetPersonsSchema } from "./validations";
import { cacheLife, cacheTag } from "next/cache";

export async function getCompetitors(input: GetPersonsSchema) {
  cacheLife("days");
  cacheTag("competitors");

  try {
    const offset = (input.page - 1) * input.perPage;

    const where = and(
      input.name
        ? accentInsensitiveContains(person.name, input.name)
        : undefined,
      input.state.length > 0 ? inArray(state.name, input.state) : undefined,
      input.gender.length > 0
        ? inArray(person.gender, input.gender)
        : undefined,
    );

    const orderBy =
      input.sort.length > 0
        ? input.sort.map((item) => {
            switch (item.id) {
              case "state":
                return item.desc ? desc(state.name) : asc(state.name);
              case "competitions":
                return item.desc
                  ? desc(countDistinct(result.competitionId))
                  : asc(countDistinct(result.competitionId));
              case "states":
                return item.desc
                  ? desc(countDistinct(competition.stateId))
                  : asc(countDistinct(competition.stateId));
              case "podiums":
                return item.desc
                  ? desc(
                      sql`count(CASE WHEN ${result.roundTypeId} IN ('f', 'c') AND ${result.pos} IN (1, 2, 3) AND ${result.best} > 0 THEN 1 END)`,
                    )
                  : asc(
                      sql`count(CASE WHEN ${result.roundTypeId} IN ('f', 'c') AND ${result.pos} IN (1, 2, 3) AND ${result.best} > 0 THEN 1 END)`,
                    );
              default:
                return item.desc ? desc(person[item.id]) : asc(person[item.id]);
            }
          })
        : [asc(person.name)];

    const { data, total } = await db.transaction(async (tx) => {
      const data = await tx
        .select({
          wcaId: person.wcaId,
          name: person.name,
          gender: person.gender,
          state: state.name,
          competitions: countDistinct(result.competitionId),
          states: countDistinct(competition.stateId),
          podiums: count(
            sql`CASE 
                      WHEN ${result.roundTypeId} IN ('f', 'c') 
                      AND ${result.pos} IN (1, 2, 3) 
                      AND ${result.best} > 0 
                      THEN 1 
                    END`,
          ),
        })
        .from(person)
        .leftJoin(state, eq(person.stateId, state.id))
        .innerJoin(result, eq(person.wcaId, result.personId))
        .innerJoin(competition, eq(result.competitionId, competition.id))
        .limit(input.perPage)
        .offset(offset)
        .where(where)
        .groupBy(person.wcaId, state.name)
        .orderBy(...orderBy);

      const total = (await tx
        .select({
          count: count(),
        })
        .from(person)
        .leftJoin(state, eq(person.stateId, state.id))
        .innerJoin(result, eq(person.wcaId, result.personId))
        .innerJoin(competition, eq(result.competitionId, competition.id))
        .where(where)
        .groupBy(person.wcaId, state.name)
        .execute()
        .then((res) => res.length)) as number;

      return {
        data,
        total,
      };
    });

    const pageCount = Math.ceil(total / input.perPage);
    return { data, pageCount };
  } catch (err) {
    console.error(err);
    return { data: [], pageCount: 0 };
  }
}

export async function getCompetitorsStateCounts() {
  cacheLife("days");
  cacheTag("competitors-state-counts");

  try {
    return await db
      .select({
        state: state.name,
        count: count(),
      })
      .from(person)
      .leftJoin(state, eq(person.stateId, state.id))
      .groupBy(state.name)
      .having(gt(count(), 0))
      .orderBy(state.name)
      .then((res) =>
        res.reduce(
          (acc, { state, count }) => {
            if (!state) return acc;
            acc[state] = count;
            return acc;
          },
          {} as Record<State["name"], number>,
        ),
      );
  } catch (err) {
    console.error(err);
    return {} as Record<State["name"], number>;
  }
}

export async function getCompetitorsGenderCounts() {
  cacheLife("days");
  cacheTag("competitors-gender-counts");

  try {
    return await db
      .select({
        gender: person.gender,
        count: count(),
      })
      .from(person)
      .groupBy(person.gender)
      .having(gt(count(), 0))
      .orderBy(person.gender)
      .then((res) =>
        res.reduce(
          (acc, { gender, count }) => {
            if (!gender) return acc;
            acc[gender] = count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      );
  } catch (err) {
    console.error(err);
    return {} as Record<string, number>;
  }
}
