"use cache";

import "server-only";
import { db } from "@workspace/db";
import { person, rankSingle, state, type Event } from "@workspace/db/schema";
import { and, asc, count, desc, eq, gt, ne } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { parseAsOfDate } from "@/lib/as-of-date";
import type { GetRankSinglesSchema } from "../validations";
import { getAsOfGenderCounts, getAsOfRanks, getAsOfStateCounts } from "./as-of";
import { countsByKey, personFilterWhere } from "./person-filter";

export async function getRankSingles(
  input: GetRankSinglesSchema,
  eventId: Event["id"],
) {
  const asOfKey = input.asOf || "all";
  cacheLife("days");
  cacheTag(`rank-singles-${eventId}-${asOfKey}`);
  cacheTag("ranks-single");

  if (parseAsOfDate(input.asOf)) {
    return await getAsOfRanks(input, eventId, "best");
  }

  const offset = (input.page - 1) * input.perPage;

  const where = and(
    ne(rankSingle.countryRank, 0),
    eq(rankSingle.eventId, eventId),
    personFilterWhere(input),
  );

  const orderBy =
    input.sort.length > 0
      ? input.sort.map((item) => {
          switch (item.id) {
            case "state":
              return item.desc ? desc(state.name) : asc(state.name);
            case "name":
              return item.desc ? desc(person.name) : asc(person.name);
            case "gender":
              return item.desc ? desc(person.gender) : asc(person.gender);
            default:
              return item.desc
                ? desc(rankSingle[item.id])
                : asc(rankSingle[item.id]);
          }
        })
      : [asc(rankSingle.countryRank)];

  const { data, total } = await db.transaction(async (tx) => {
    const data = await tx
      .select({
        personId: rankSingle.personId,
        stateRank: rankSingle.stateRank,
        countryRank: rankSingle.countryRank,
        name: person.name,
        best: rankSingle.best,
        state: state.name,
        gender: person.gender,
      })
      .from(rankSingle)
      .innerJoin(person, eq(rankSingle.personId, person.wcaId))
      .leftJoin(state, eq(person.stateId, state.id))
      .limit(input.perPage)
      .offset(offset)
      .where(where)
      .orderBy(...orderBy);

    const total = (await tx
      .select({
        count: count(),
      })
      .from(rankSingle)
      .innerJoin(person, eq(rankSingle.personId, person.wcaId))
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
}

export async function getRankSinglesStateCounts(
  eventId: Event["id"],
  asOf = "",
) {
  const asOfKey = asOf || "all";
  cacheLife("days");
  cacheTag(`rank-singles-state-counts-${eventId}-${asOfKey}`);
  cacheTag("ranks-single");

  if (parseAsOfDate(asOf)) {
    return await getAsOfStateCounts(eventId, asOf, "best");
  }

  const rows = await db
    .select({ key: state.name, count: count() })
    .from(rankSingle)
    .innerJoin(person, eq(rankSingle.personId, person.wcaId))
    .leftJoin(state, eq(person.stateId, state.id))
    .where(eq(rankSingle.eventId, eventId))
    .groupBy(state.name)
    .having(gt(count(), 0))
    .orderBy(state.name);

  return countsByKey(rows);
}

export async function getRankSinglesGenderCounts(
  eventId: Event["id"],
  asOf = "",
) {
  const asOfKey = asOf || "all";
  cacheLife("days");
  cacheTag(`rank-singles-gender-counts-${eventId}-${asOfKey}`);
  cacheTag("ranks-single");

  if (parseAsOfDate(asOf)) {
    return await getAsOfGenderCounts(eventId, asOf, "best");
  }

  const rows = await db
    .select({ key: person.gender, count: count() })
    .from(rankSingle)
    .innerJoin(person, eq(rankSingle.personId, person.wcaId))
    .where(eq(rankSingle.eventId, eventId))
    .groupBy(person.gender)
    .having(gt(count(), 0))
    .orderBy(person.gender);

  return countsByKey<string>(rows);
}
