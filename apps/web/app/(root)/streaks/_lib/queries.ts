"use cache";

import "server-only";
import { db } from "@workspace/db";
import { state, person, streakRanks, type State } from "@workspace/db/schema";
import { and, count, ilike, gt, eq, desc, asc, inArray } from "drizzle-orm";
import { type GetStreakRanksSchema } from "./validations";
import { cacheLife, cacheTag } from "next/cache";

export async function getStreakRanks(input: GetStreakRanksSchema) {
  cacheLife("days");
  cacheTag("streak-ranks");

  try {
    const offset = (input.page - 1) * input.perPage;

    const where = and(
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
              case "name":
                return item.desc ? desc(person.name) : asc(person.name);
              case "state":
                return item.desc ? desc(state.name) : asc(state.name);
              case "gender":
                return item.desc ? desc(person.gender) : asc(person.gender);
              // default:
              //   return item.desc
              //     ? desc(streakRanks[item.id as keyof typeof streakRanks])
              //     : asc(streakRanks[item.id as keyof typeof streakRanks]);
            }
          })
        : [asc(streakRanks.rank)];

    const { data, total } = await db.transaction(async (tx) => {
      const data = await tx
        .select({
          rank: streakRanks.rank,
          personId: streakRanks.personId,
          name: person.name,
          currentStreak: streakRanks.currentStreak,
          longestStreak: streakRanks.longestStreak,
          state: state.name,
          gender: person.gender,
        })
        .from(streakRanks)
        .innerJoin(person, eq(streakRanks.personId, person.wcaId))
        .leftJoin(state, eq(person.stateId, state.id))
        .limit(input.perPage)
        .offset(offset)
        .where(where);
      // .orderBy(...orderBy);

      const total = (await tx
        .select({
          count: count(),
        })
        .from(streakRanks)
        .innerJoin(person, eq(streakRanks.personId, person.wcaId))
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

export async function getStreakRanksStateCounts() {
  cacheLife("days");
  cacheTag("streak-ranks-state-counts");

  try {
    return await db
      .select({
        state: state.name,
        count: count(),
      })
      .from(streakRanks)
      .innerJoin(person, eq(streakRanks.personId, person.wcaId))
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

export async function getStreakRanksGenderCounts() {
  cacheLife("days");
  cacheTag("streak-ranks-gender-counts");

  try {
    return await db
      .select({
        gender: person.gender,
        count: count(),
      })
      .from(streakRanks)
      .innerJoin(person, eq(streakRanks.personId, person.wcaId))
      .groupBy(person.gender)
      .having(gt(count(), 0))
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
