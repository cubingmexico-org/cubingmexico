"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  state,
  type State,
  type Event,
  person,
  result,
  competition,
} from "@workspace/db/schema";
import {
  and,
  count,
  ilike,
  gt,
  inArray,
  eq,
  asc,
  desc,
  sql,
} from "drizzle-orm";
import type {
  GetResultAveragesSchema,
  GetResultSinglesSchema,
} from "./validations";
import { cacheLife, cacheTag } from "next/cache";

export async function getRankSingles(
  input: GetResultSinglesSchema,
  eventId: Event["id"],
) {
  cacheLife("days");
  cacheTag("results-single");

  try {
    const offset = (input.page - 1) * input.perPage;

    const where = and(
      gt(result.best, 0),
      eq(result.eventId, eventId),
      input.name ? ilike(person.name, `%${input.name}%`) : undefined,
      input.state.length > 0 ? inArray(state.name, input.state) : undefined,
      input.gender.length > 0
        ? inArray(person.gender, input.gender)
        : undefined,
    );

    const orderBy =
      input.sort.length > 0
        ? input.sort.map((item) => {
            switch (item.id) {
              case "index":
                return item.desc
                  ? desc(sql<number>`row_number() over()`.mapWith(Number))
                  : asc(sql<number>`row_number() over()`.mapWith(Number));
              case "state":
                return item.desc ? desc(state.name) : asc(state.name);
              case "name":
                return item.desc ? desc(person.name) : asc(person.name);
              case "gender":
                return item.desc ? desc(person.gender) : asc(person.gender);
              case "competition":
                return item.desc
                  ? desc(competition.name)
                  : asc(competition.name);
              default:
                return item.desc ? desc(result[item.id]) : asc(result[item.id]);
            }
          })
        : [asc(result.best)];

    const { data, total } = await db.transaction(async (tx) => {
      const data = await tx
        .select({
          index: sql<number>`row_number() over()`.mapWith(Number),
          personId: result.personId,
          name: person.name,
          best: result.best,
          state: state.name,
          gender: person.gender,
          competition: competition.name,
          competitionId: result.competitionId,
        })
        .from(result)
        .innerJoin(person, eq(result.personId, person.wcaId))
        .innerJoin(competition, eq(result.competitionId, competition.id))
        .leftJoin(state, eq(person.stateId, state.id))
        .limit(input.perPage)
        .offset(offset)
        .where(where)
        .orderBy(...orderBy);

      const total = (await tx
        .select({
          count: count(),
        })
        .from(result)
        .innerJoin(person, eq(result.personId, person.wcaId))
        .innerJoin(competition, eq(result.competitionId, competition.id))
        .leftJoin(state, eq(person.stateId, state.id))
        .where(where)
        .execute()
        .then((res) => res[0]?.count ?? 0)) as number;

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

export async function getRankSinglesStateCounts(eventId: Event["id"]) {
  cacheLife("days");
  cacheTag("results-single-state-counts");

  try {
    return await db
      .select({
        state: state.name,
        count: count(),
      })
      .from(result)
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .leftJoin(state, eq(person.stateId, state.id))
      .where(eq(result.eventId, eventId))
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

export async function getRankSinglesGenderCounts(eventId: Event["id"]) {
  cacheLife("days");
  cacheTag("results-single-gender-counts");

  try {
    return await db
      .select({
        gender: person.gender,
        count: count(),
      })
      .from(result)
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(eq(result.eventId, eventId))
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

export async function getRankAverages(
  input: GetResultAveragesSchema,
  eventId: Event["id"],
) {
  cacheLife("days");
  cacheTag("results-average");

  try {
    const offset = (input.page - 1) * input.perPage;

    const where = and(
      gt(result.average, 0),
      eq(result.eventId, eventId),
      input.name ? ilike(person.name, `%${input.name}%`) : undefined,
      input.state.length > 0 ? inArray(state.name, input.state) : undefined,
      input.gender.length > 0
        ? inArray(person.gender, input.gender)
        : undefined,
    );

    const orderBy =
      input.sort.length > 0
        ? input.sort.map((item) => {
            switch (item.id) {
              case "index":
                return item.desc
                  ? desc(sql<number>`row_number() over()`.mapWith(Number))
                  : asc(sql<number>`row_number() over()`.mapWith(Number));
              case "state":
                return item.desc ? desc(state.name) : asc(state.name);
              case "name":
                return item.desc ? desc(person.name) : asc(person.name);
              case "gender":
                return item.desc ? desc(person.gender) : asc(person.gender);
              case "competition":
                return item.desc
                  ? desc(competition.name)
                  : asc(competition.name);
              default:
                return item.desc ? desc(result[item.id]) : asc(result[item.id]);
            }
          })
        : [asc(result.average)];

    const { data, total } = await db.transaction(async (tx) => {
      const data = await tx
        .select({
          index: sql<number>`row_number() over()`.mapWith(Number),
          personId: result.personId,
          name: person.name,
          average: result.average,
          state: state.name,
          gender: person.gender,
          competition: competition.name,
          competitionId: competition.id,
        })
        .from(result)
        .innerJoin(person, eq(result.personId, person.wcaId))
        .innerJoin(competition, eq(result.competitionId, competition.id))
        .leftJoin(state, eq(person.stateId, state.id))
        .limit(input.perPage)
        .offset(offset)
        .where(where)
        .orderBy(...orderBy);

      const total = (await tx
        .select({
          count: count(),
        })
        .from(result)
        .innerJoin(person, eq(result.personId, person.wcaId))
        .innerJoin(competition, eq(result.competitionId, competition.id))
        .leftJoin(state, eq(person.stateId, state.id))
        .where(where)
        .execute()
        .then((res) => res[0]?.count ?? 0)) as number;

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

export async function getRankAveragesStateCounts(eventId: Event["id"]) {
  cacheLife("days");
  cacheTag("results-average-state-counts");

  try {
    return await db
      .select({
        state: state.name,
        count: count(),
      })
      .from(result)
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .leftJoin(state, eq(person.stateId, state.id))
      .where(eq(result.eventId, eventId))
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

export async function getRankAveragesGenderCounts(eventId: Event["id"]) {
  cacheLife("days");
  cacheTag(`results-average-gender-counts-${eventId}`);

  try {
    return await db
      .select({
        gender: person.gender,
        count: count(),
      })
      .from(result)
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .leftJoin(state, eq(person.stateId, state.id))
      .where(eq(result.eventId, eventId))
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
