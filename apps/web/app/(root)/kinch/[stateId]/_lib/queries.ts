"use cache";

import "server-only";
import { db } from "@workspace/db";
import { EXCLUDED_EVENTS, SINGLE_EVENTS } from "@/lib/constants";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

interface KinchRanksState {
  id: string;
  name: string;
  events: { eventId: string; ratio: number }[];
  overall: number;
}

export async function getKinchRanksState(
  stateId: string,
): Promise<KinchRanksState[]> {
  cacheLife("days");
  cacheTag("kinch-ranks-state");

  try {
    const data = await db.execute(sql`
              WITH PersonalRecords AS (
                SELECT
                  person_id,
                  event_id,
                  MIN(best) AS personal_best,
                  'average' AS type
                FROM ranks_average
                WHERE event_id NOT IN (${sql.join(EXCLUDED_EVENTS, sql`, `)})
                GROUP BY person_id, event_id
                UNION ALL
                SELECT
                  person_id,
                  event_id,
                  MIN(best) AS personal_best,
                  'single' AS type
                FROM ranks_single
                WHERE event_id IN (${sql.join(SINGLE_EVENTS, sql`, `)})
                GROUP BY person_id, event_id
              ),
              StateRecords AS (
                SELECT
                  r.event_id,
                  MIN(r.best) AS state_best,
                  'average' AS type
                FROM ranks_average r
                JOIN persons p ON r.person_id = p.wca_id
                WHERE r.state_rank = 1
                  AND p.state_id = ${stateId}
                  AND r.event_id NOT IN (${sql.join(EXCLUDED_EVENTS, sql`, `)})
                GROUP BY r.event_id
                UNION ALL
                SELECT
                  r.event_id,
                  MIN(r.best) AS state_best,
                  'single' AS type
                FROM ranks_single r
                JOIN persons p ON r.person_id = p.wca_id
                WHERE r.state_rank = 1
                  AND p.state_id = ${stateId}
                  AND r.event_id IN (${sql.join(SINGLE_EVENTS, sql`, `)})
                GROUP BY r.event_id
              ),
              Persons AS (
                SELECT 
                  wca_id AS person_id,
                  name
                FROM persons
                WHERE state_id = ${stateId}
              ),
              Events AS (
                SELECT id, rank
                FROM events
                WHERE id NOT IN (${sql.join(EXCLUDED_EVENTS, sql`, `)})
              ),
              Ratios AS (
                SELECT  
                  p.person_id,
                  e.id AS event_id,
                  e.rank,
                  MAX(
                    CASE 
                      WHEN e.id = '333mbf' THEN
                        CASE 
                          WHEN COALESCE(pr.personal_best, 0) != 0 THEN 
                            ((99 - CAST(SUBSTRING(CAST(pr.personal_best AS TEXT), 1, 2) AS FLOAT) + 
                              (1 - (CAST(SUBSTRING(CAST(pr.personal_best AS TEXT), 3, 5) AS FLOAT) / 3600))) / 
                            ((99 - CAST(SUBSTRING(CAST(sr.state_best AS TEXT), 1, 2) AS FLOAT)) + 
                              (1 - (CAST(SUBSTRING(CAST(sr.state_best AS TEXT), 3, 5) AS FLOAT) / 3600)))
                            ) * 100
                          ELSE 0
                        END
                      WHEN COALESCE(pr.personal_best, 0) != 0 THEN 
                        (sr.state_best / COALESCE(pr.personal_best, 0)::FLOAT) * 100
                      ELSE 0
                    END
                  ) AS best_ratio
                FROM Persons p
                CROSS JOIN Events e
                LEFT JOIN PersonalRecords pr ON p.person_id = pr.person_id AND e.id = pr.event_id
                LEFT JOIN StateRecords sr ON e.id = sr.event_id AND pr.type = sr.type
                GROUP BY p.person_id, e.id, e.rank
              )
              SELECT 
                p.person_id AS id,
                p.name,
                json_agg(
                  json_build_object(
                    'eventId', r.event_id,
                    'ratio', r.best_ratio
                  )
                  ORDER BY r.rank
                ) AS events,
                AVG(r.best_ratio) AS overall
              FROM Ratios r
              JOIN Persons p ON r.person_id = p.person_id
              GROUP BY p.person_id, p.name
              ORDER BY overall DESC;
            `);

    const persons = data as unknown as KinchRanksState[];

    return persons;
  } catch (err) {
    console.error(err);
    return [];
  }
}
