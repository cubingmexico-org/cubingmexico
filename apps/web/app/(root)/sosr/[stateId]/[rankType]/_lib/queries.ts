"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  event,
  person,
  rankAverage,
  rankSingle,
  state,
} from "@workspace/db/schema";
import { EXCLUDED_EVENTS } from "@/lib/constants";
import { accentInsensitiveContains } from "@/lib/search";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type { SumOfStateRanks } from "../_types";
import { GetSOSRSinglesSchema } from "./validations";

type RankType = "single" | "average";

function getRankTable(rankType: RankType) {
  return rankType === "single" ? rankSingle : rankAverage;
}

function getExcludedEventsList() {
  return sql.join(
    EXCLUDED_EVENTS.map((value) => sql`${value}`),
    sql`, `,
  );
}

export async function getSOSR(
  input: GetSOSRSinglesSchema,
  stateId: string,
  rankType: RankType,
) {
  cacheLife("days");
  cacheTag(`sosr-${stateId}-${rankType}`);

  const offset = (input.page - 1) * input.perPage;

  const rankTable = getRankTable(rankType);
  const excludedEvents = getExcludedEventsList();
  const peopleFilters: SQL[] = [];
  if (input.name) {
    peopleFilters.push(accentInsensitiveContains(sql`p.name`, input.name));
  }
  if (input.gender && input.gender.length > 0) {
    peopleFilters.push(
      sql`p.gender IN (${sql.join(
        input.gender.map((g: string) => sql`${g}`),
        sql`, `,
      )})`,
    );
  }

  const peopleFilterSql =
    peopleFilters.length > 0
      ? sql`AND ${sql.join(peopleFilters, sql` AND `)}`
      : sql``;

  const orderFragments: SQL[] =
    input.sort && input.sort.length > 0
      ? input.sort.map((item) => {
          switch (item.id) {
            case "name":
              return item.desc ? sql`p.name DESC` : sql`p.name ASC`;
            case "gender":
              return item.desc ? sql`p.gender DESC` : sql`p.gender ASC`;
            default:
              return item.desc ? sql`t.overall DESC` : sql`t.overall ASC`;
          }
        })
      : [sql`t.overall ASC`, sql`p.name ASC`];

  const totalRows = (await db.execute(
    sql`
      WITH people AS (
        SELECT DISTINCT p.wca_id
        FROM ${person} p
        INNER JOIN ${rankTable} r ON r.person_id = p.wca_id
        WHERE p.state_id = ${stateId}
          AND r.state_rank IS NOT NULL
          ${peopleFilterSql}
      )
      SELECT count(*)::int AS count FROM people;
    `,
  )) as unknown as { count: number }[];

  const data = (await db.execute(
    sql`
      WITH events AS (
        SELECT id, rank
        FROM ${event}
        WHERE id NOT IN (${excludedEvents})
      ),
      worst_ranks AS (
        SELECT
          r.event_id,
          MAX(r.state_rank) + 1 AS worst_rank
        FROM ${rankTable} r
        INNER JOIN ${person} p ON p.wca_id = r.person_id
        WHERE p.state_id = ${stateId}
          AND r.state_rank IS NOT NULL
          AND r.event_id NOT IN (${excludedEvents})
        GROUP BY r.event_id
      ),
      people AS (
        SELECT
          p.wca_id AS person_id,
          p.name,
          s.name AS state,
          p.gender
        FROM ${person} p
        LEFT JOIN ${state} s ON p.state_id = s.id
        WHERE p.state_id = ${stateId}
          ${peopleFilterSql}
          AND EXISTS (
            SELECT 1
            FROM ${rankTable} r
            WHERE r.person_id = p.wca_id
              AND r.state_rank IS NOT NULL
          )
      ),
      rank_data AS (
        SELECT
          r.person_id,
          r.event_id,
          r.state_rank
        FROM ${rankTable} r
        INNER JOIN ${person} p ON p.wca_id = r.person_id
        WHERE p.state_id = ${stateId}
          AND r.event_id NOT IN (${excludedEvents})
      ),
      person_events AS (
        SELECT
          p.person_id,
          p.name,
          p.state,
          p.gender,
          e.id AS event_id,
          e.rank,
          COALESCE(NULLIF(r.state_rank, 0), COALESCE(wr.worst_rank, 1)) AS state_rank,
          r.state_rank AS original_state_rank
        FROM people p
        CROSS JOIN events e
        LEFT JOIN rank_data r
          ON r.person_id = p.person_id
         AND r.event_id = e.id
        LEFT JOIN worst_ranks wr
          ON wr.event_id = e.id
      ),
      totals AS (
        SELECT
          person_id,
          SUM(state_rank) AS overall
        FROM person_events
        GROUP BY person_id
      ),
      ranked AS (
        SELECT
          p.person_id,
          p.name,
          p.state,
          p.gender,
          t.overall,
          ROW_NUMBER() OVER (ORDER BY ${sql.join(orderFragments, sql`, `)}) AS rank
        FROM people p
        INNER JOIN totals t ON t.person_id = p.person_id
      ),
      paged AS (
        SELECT *
        FROM ranked
        ORDER BY rank
        LIMIT ${input.perPage}
        OFFSET ${offset}
      )
      SELECT
        p.rank,
        p.person_id AS "personId",
        p.name,
        p.overall,
        p.state,
        p.gender,
        json_agg(
          json_build_object(
            'eventId', pe.event_id,
            'stateRank', pe.state_rank,
            'completed', (
              CASE WHEN pe.original_state_rank IS NOT NULL AND pe.original_state_rank > 0
              THEN true ELSE false END
            )
          )
          ORDER BY pe.rank
        ) AS events
      FROM paged p
      INNER JOIN person_events pe ON pe.person_id = p.person_id
      GROUP BY p.rank, p.person_id, p.name, p.overall, p.state, p.gender
      ORDER BY p.rank;
    `,
  )) as unknown as SumOfStateRanks[];

  return {
    data,
    pageCount: Math.ceil((totalRows[0]?.count ?? 0) / input.perPage),
  };
}

export async function getSOSRGenderCounts(stateId: string, rankType: RankType) {
  cacheLife("days");
  cacheTag(`sosr-gender-counts-${stateId}-${rankType}`);

  const rankTable = getRankTable(rankType);

  return await db
    .select({
      gender: person.gender,
      count: sql<number>`count(distinct ${person.wcaId})`.mapWith(Number),
    })
    .from(rankTable)
    .innerJoin(person, eq(rankTable.personId, person.wcaId))
    .where(
      and(eq(person.stateId, stateId), sql`${rankTable.stateRank} is not null`),
    )
    .groupBy(person.gender)
    .orderBy(person.gender)
    .then((rows) =>
      rows.reduce(
        (acc, { gender, count }) => {
          if (!gender) return acc;
          acc[gender] = count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    );
}

export async function getSOSRState(stateId: string) {
  cacheLife("days");
  cacheTag(`sosr-state-${stateId}`);

  const result = await db
    .select({
      name: state.name,
    })
    .from(state)
    .where(eq(state.id, stateId))
    .limit(1);

  return result[0] ?? null;
}
