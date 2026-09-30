"use cache";

import "server-only";
import { db } from "@workspace/db";
import { state, person, nemesisStats, type State } from "@workspace/db/schema";
import { and, asc, count, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { accentInsensitiveContains } from "@/lib/search";
import type { GetNemesisStatsSchema } from "./validations";
import type { NemesisStatsView } from "./views";

function viewMetric(view: NemesisStatsView) {
  return view === "mas-nemesis"
    ? nemesisStats.nemesisCount
    : nemesisStats.nemesizedCount;
}

export async function getNemesisStatsTable(input: GetNemesisStatsSchema) {
  cacheLife("days");
  cacheTag("nemesis-stats");

  const offset = (input.page - 1) * input.perPage;
  const metric = viewMetric(input.view);

  const where = and(
    input.view === "invictos" ? eq(nemesisStats.nemesisCount, 0) : undefined,
    input.minEvents > 1
      ? gte(nemesisStats.eventCount, input.minEvents)
      : undefined,
    input.name ? accentInsensitiveContains(person.name, input.name) : undefined,
    input.state.length > 0 ? inArray(state.name, input.state) : undefined,
    input.gender.length > 0 ? inArray(person.gender, input.gender) : undefined,
  );

  const orderBy =
    input.sort.length > 0
      ? input.sort.map((item) => {
          switch (item.id) {
            case "name":
              return item.desc ? desc(person.name) : asc(person.name);
            case "eventCount":
              return item.desc
                ? desc(nemesisStats.eventCount)
                : asc(nemesisStats.eventCount);
            case "nemesisCount":
              return item.desc
                ? desc(nemesisStats.nemesisCount)
                : asc(nemesisStats.nemesisCount);
            default:
              return item.desc
                ? desc(nemesisStats.nemesizedCount)
                : asc(nemesisStats.nemesizedCount);
          }
        })
      : [desc(metric), asc(person.name)];

  const { data, total } = await db.transaction(async (tx) => {
    const data = await tx
      .select({
        rank: sql<number>`rank() over (order by ${metric} desc)`.mapWith(
          Number,
        ),
        personId: nemesisStats.personId,
        name: person.name,
        state: state.name,
        gender: person.gender,
        eventCount: nemesisStats.eventCount,
        nemesisCount: nemesisStats.nemesisCount,
        nemesizedCount: nemesisStats.nemesizedCount,
      })
      .from(nemesisStats)
      .innerJoin(person, eq(nemesisStats.personId, person.wcaId))
      .leftJoin(state, eq(person.stateId, state.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(input.perPage)
      .offset(offset);

    const total = await tx
      .select({ count: count() })
      .from(nemesisStats)
      .innerJoin(person, eq(nemesisStats.personId, person.wcaId))
      .leftJoin(state, eq(person.stateId, state.id))
      .where(where)
      .then((res) => res[0]?.count ?? 0);

    return { data, total };
  });

  const pageCount = Math.ceil(total / input.perPage);
  return { data, pageCount };
}

export async function getNemesisSummary() {
  cacheLife("days");
  cacheTag("nemesis-stats");

  const [totals] = await db
    .select({
      competitors: count(),
      invictos: sql<number>`count(*) filter (where ${nemesisStats.nemesisCount} = 0)`.mapWith(
        Number,
      ),
      averageNemeses:
        sql<number>`coalesce(avg(${nemesisStats.nemesisCount}), 0)`.mapWith(
          Number,
        ),
      medianNemeses:
        sql<number>`coalesce(percentile_cont(0.5) within group (order by ${nemesisStats.nemesisCount}), 0)`.mapWith(
          Number,
        ),
    })
    .from(nemesisStats);

  const [topNemesized] = await db
    .select({
      personId: nemesisStats.personId,
      name: person.name,
      nemesizedCount: nemesisStats.nemesizedCount,
    })
    .from(nemesisStats)
    .innerJoin(person, eq(nemesisStats.personId, person.wcaId))
    .orderBy(desc(nemesisStats.nemesizedCount), asc(person.name))
    .limit(1);

  return {
    competitors: totals?.competitors ?? 0,
    invictos: totals?.invictos ?? 0,
    averageNemeses: totals?.averageNemeses ?? 0,
    medianNemeses: totals?.medianNemeses ?? 0,
    topNemesized: topNemesized ?? null,
  };
}

export async function getNemesisStateBreakdown() {
  cacheLife("days");
  cacheTag("nemesis-stats");

  return db
    .select({
      stateId: state.id,
      state: state.name,
      competitors: count(),
      invictos: sql<number>`count(*) filter (where ${nemesisStats.nemesisCount} = 0)`.mapWith(
        Number,
      ),
      averageNemeses: sql<number>`avg(${nemesisStats.nemesisCount})`.mapWith(
        Number,
      ),
    })
    .from(nemesisStats)
    .innerJoin(person, eq(nemesisStats.personId, person.wcaId))
    .innerJoin(state, eq(person.stateId, state.id))
    .groupBy(state.id, state.name)
    .orderBy(
      desc(sql`count(*) filter (where ${nemesisStats.nemesisCount} = 0)`),
      asc(state.name),
    );
}

export async function getNemesisStatsStateCounts() {
  cacheLife("days");
  cacheTag("nemesis-stats");

  return db
    .select({ state: state.name, count: count() })
    .from(nemesisStats)
    .innerJoin(person, eq(nemesisStats.personId, person.wcaId))
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

export async function getNemesisStatsGenderCounts() {
  cacheLife("days");
  cacheTag("nemesis-stats");

  return db
    .select({ gender: person.gender, count: count() })
    .from(nemesisStats)
    .innerJoin(person, eq(nemesisStats.personId, person.wcaId))
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
}
