"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  state,
  type State,
  type Event,
  person,
  rankSingle,
  rankAverage,
  result,
  competition,
} from "@workspace/db/schema";
import { and, asc, count, desc, gt, inArray, ne, eq, sql } from "drizzle-orm";
import { accentInsensitiveContains } from "@/lib/search";
import { competitionAsOfCondition, parseAsOfDate } from "@/lib/as-of-date";
import type {
  GetRankAveragesSchema,
  GetRankSinglesSchema,
} from "./validations";
import { cacheLife, cacheTag } from "next/cache";

function personFilterWhere(input: {
  name: string;
  state: string[];
  gender: ("m" | "f" | "o")[];
}) {
  return and(
    input.name ? accentInsensitiveContains(person.name, input.name) : undefined,
    input.state.length > 0 ? inArray(state.name, input.state) : undefined,
    input.gender.length > 0 ? inArray(person.gender, input.gender) : undefined,
  );
}

async function getAsOfRankSingles(
  input: GetRankSinglesSchema,
  eventId: Event["id"],
) {
  const offset = (input.page - 1) * input.perPage;

  const personalBests = db.$with("personal_bests").as(
    db
      .select({
        personId: result.personId,
        best: sql<number>`min(${result.best})`.as("best"),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(
        and(
          gt(result.best, 0),
          eq(result.eventId, eventId),
          competitionAsOfCondition(input.asOf),
        ),
      )
      .groupBy(result.personId),
  );

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

async function getAsOfRankAverages(
  input: GetRankAveragesSchema,
  eventId: Event["id"],
) {
  const offset = (input.page - 1) * input.perPage;

  const personalBests = db.$with("personal_bests").as(
    db
      .select({
        personId: result.personId,
        best: sql<number>`min(${result.average})`.as("best"),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(
        and(
          gt(result.average, 0),
          eq(result.eventId, eventId),
          competitionAsOfCondition(input.asOf),
        ),
      )
      .groupBy(result.personId),
  );

  const ranked = db.$with("ranked").as(
    db
      .select({
        personId: personalBests.personId,
        best: personalBests.best,
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

async function getAsOfSinglesStateCounts(eventId: Event["id"], asOf: string) {
  const personalBests = db.$with("personal_bests").as(
    db
      .select({
        personId: result.personId,
        best: sql<number>`min(${result.best})`.as("best"),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(
        and(
          gt(result.best, 0),
          eq(result.eventId, eventId),
          competitionAsOfCondition(asOf),
        ),
      )
      .groupBy(result.personId),
  );

  return await db
    .with(personalBests)
    .select({
      state: state.name,
      count: count(),
    })
    .from(personalBests)
    .innerJoin(person, eq(personalBests.personId, person.wcaId))
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
}

async function getAsOfSinglesGenderCounts(eventId: Event["id"], asOf: string) {
  const personalBests = db.$with("personal_bests").as(
    db
      .select({
        personId: result.personId,
        best: sql<number>`min(${result.best})`.as("best"),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(
        and(
          gt(result.best, 0),
          eq(result.eventId, eventId),
          competitionAsOfCondition(asOf),
        ),
      )
      .groupBy(result.personId),
  );

  return await db
    .with(personalBests)
    .select({
      gender: person.gender,
      count: count(),
    })
    .from(personalBests)
    .innerJoin(person, eq(personalBests.personId, person.wcaId))
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
}

async function getAsOfAveragesStateCounts(eventId: Event["id"], asOf: string) {
  const personalBests = db.$with("personal_bests").as(
    db
      .select({
        personId: result.personId,
        best: sql<number>`min(${result.average})`.as("best"),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(
        and(
          gt(result.average, 0),
          eq(result.eventId, eventId),
          competitionAsOfCondition(asOf),
        ),
      )
      .groupBy(result.personId),
  );

  return await db
    .with(personalBests)
    .select({
      state: state.name,
      count: count(),
    })
    .from(personalBests)
    .innerJoin(person, eq(personalBests.personId, person.wcaId))
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
}

async function getAsOfAveragesGenderCounts(eventId: Event["id"], asOf: string) {
  const personalBests = db.$with("personal_bests").as(
    db
      .select({
        personId: result.personId,
        best: sql<number>`min(${result.average})`.as("best"),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(
        and(
          gt(result.average, 0),
          eq(result.eventId, eventId),
          competitionAsOfCondition(asOf),
        ),
      )
      .groupBy(result.personId),
  );

  return await db
    .with(personalBests)
    .select({
      gender: person.gender,
      count: count(),
    })
    .from(personalBests)
    .innerJoin(person, eq(personalBests.personId, person.wcaId))
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
}

export async function getRankSingles(
  input: GetRankSinglesSchema,
  eventId: Event["id"],
) {
  const asOfKey = input.asOf || "all";
  cacheLife("days");
  cacheTag(`rank-singles-${eventId}-${asOfKey}`);
  cacheTag("ranks-single");

  if (parseAsOfDate(input.asOf)) {
    return await getAsOfRankSingles(input, eventId);
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
    return await getAsOfSinglesStateCounts(eventId, asOf);
  }

  return await db
    .select({
      state: state.name,
      count: count(),
    })
    .from(rankSingle)
    .innerJoin(person, eq(rankSingle.personId, person.wcaId))
    .leftJoin(state, eq(person.stateId, state.id))
    .where(eq(rankSingle.eventId, eventId))
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
    return await getAsOfSinglesGenderCounts(eventId, asOf);
  }

  return await db
    .select({
      gender: person.gender,
      count: count(),
    })
    .from(rankSingle)
    .innerJoin(person, eq(rankSingle.personId, person.wcaId))
    .where(eq(rankSingle.eventId, eventId))
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
}

export async function getRankAverages(
  input: GetRankAveragesSchema,
  eventId: Event["id"],
) {
  const asOfKey = input.asOf || "all";
  cacheLife("days");
  cacheTag(`rank-averages-${eventId}-${asOfKey}`);
  cacheTag("ranks-average");

  if (parseAsOfDate(input.asOf)) {
    return await getAsOfRankAverages(input, eventId);
  }

  const offset = (input.page - 1) * input.perPage;

  const where = and(
    ne(rankAverage.countryRank, 0),
    eq(rankAverage.eventId, eventId),
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
                ? desc(rankAverage[item.id])
                : asc(rankAverage[item.id]);
          }
        })
      : [asc(rankAverage.countryRank)];

  const { data, total } = await db.transaction(async (tx) => {
    const data = await tx
      .select({
        personId: rankAverage.personId,
        stateRank: rankAverage.stateRank,
        countryRank: rankAverage.countryRank,
        name: person.name,
        best: rankAverage.best,
        state: state.name,
        gender: person.gender,
      })
      .from(rankAverage)
      .innerJoin(person, eq(rankAverage.personId, person.wcaId))
      .leftJoin(state, eq(person.stateId, state.id))
      .limit(input.perPage)
      .offset(offset)
      .where(where)
      .orderBy(...orderBy);

    const total = (await tx
      .select({
        count: count(),
      })
      .from(rankAverage)
      .innerJoin(person, eq(rankAverage.personId, person.wcaId))
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

export async function getRankAveragesStateCounts(
  eventId: Event["id"],
  asOf = "",
) {
  const asOfKey = asOf || "all";
  cacheLife("days");
  cacheTag(`rank-averages-state-counts-${eventId}-${asOfKey}`);
  cacheTag("ranks-average");

  if (parseAsOfDate(asOf)) {
    return await getAsOfAveragesStateCounts(eventId, asOf);
  }

  return await db
    .select({
      state: state.name,
      count: count(),
    })
    .from(rankAverage)
    .innerJoin(person, eq(rankAverage.personId, person.wcaId))
    .leftJoin(state, eq(person.stateId, state.id))
    .where(eq(rankAverage.eventId, eventId))
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
}

export async function getRankAveragesGenderCounts(
  eventId: Event["id"],
  asOf = "",
) {
  const asOfKey = asOf || "all";
  cacheLife("days");
  cacheTag(`rank-averages-gender-counts-${eventId}-${asOfKey}`);
  cacheTag("ranks-average");

  if (parseAsOfDate(asOf)) {
    return await getAsOfAveragesGenderCounts(eventId, asOf);
  }

  return await db
    .select({
      gender: person.gender,
      count: count(),
    })
    .from(rankAverage)
    .innerJoin(person, eq(rankAverage.personId, person.wcaId))
    .where(eq(rankAverage.eventId, eventId))
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
}
