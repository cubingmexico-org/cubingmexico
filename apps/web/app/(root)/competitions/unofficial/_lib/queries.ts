"use cache";

import "server-only";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

export interface CompetitionUnofficialEvent {
  id: string;
  name: string;
}

export interface CompetitionWithUnofficialEvents {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  cityName: string;
  logo: string | null;
  stateId: string | null;
  stateName: string | null;
  events: CompetitionUnofficialEvent[];
}

/** WCA competitions that have at least one Cubing Contests (unofficial) result. */
export async function getCompetitionsWithUnofficialEvents(): Promise<
  CompetitionWithUnofficialEvents[]
> {
  cacheLife("days");
  cacheTag("cc-results", "competitions-unofficial");

  const rows = (await db.execute(sql`
    SELECT
      c.id,
      c.name,
      c.start_date AS "startDate",
      c.end_date AS "endDate",
      c.city_name AS "cityName",
      c.logo,
      c.state_id AS "stateId",
      s.name AS "stateName",
      json_agg(
        json_build_object('id', e.id, 'name', e.name)
        ORDER BY e.rank, e.id
      ) AS events
    FROM competitions c
    JOIN (
      SELECT DISTINCT competition_id, event_id
      FROM cc_results
    ) r ON r.competition_id = c.id
    JOIN cc_events e ON e.id = r.event_id
    LEFT JOIN states s ON s.id = c.state_id
    GROUP BY
      c.id,
      c.name,
      c.start_date,
      c.end_date,
      c.city_name,
      c.logo,
      c.state_id,
      s.name
    ORDER BY c.start_date DESC
  `)) as unknown as {
    id: string;
    name: string;
    startDate: Date | string;
    endDate: Date | string;
    cityName: string;
    logo: string | null;
    stateId: string | null;
    stateName: string | null;
    events: CompetitionUnofficialEvent[];
  }[];

  return rows.map((row) => ({
    ...row,
    startDate: new Date(row.startDate),
    endDate: new Date(row.endDate),
    events: row.events ?? [],
  }));
}
