"use cache";

import "server-only";
import { db } from "@workspace/db";
import { EXCLUDED_EVENTS, SINGLE_EVENTS } from "@/lib/constants";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

interface KinchRanksTeams {
  stateId: string;
  name: string;
  overall: number;
  events: {
    personId: string;
    personName: string;
    eventId: string;
    ratio: number;
  }[];
}

export async function getKinchRanksTeams(): Promise<KinchRanksTeams[]> {
  cacheLife("days");
  cacheTag("kinch-ranks-teams-data");

  try {
    const data = await db.execute(
      sql`
              WITH PersonalKinch AS (
                SELECT
                  p.wca_id,
                  p.state_id,
                  p.name,
                  pr.event_id,
                  pr.type,
                  CASE 
                    WHEN pr.event_id = '333mbf' THEN
                      CASE 
                        WHEN COALESCE(pr.personal_best, 0) != 0 THEN 
                          (
                            (99 - CAST(SUBSTRING(CAST(pr.personal_best AS TEXT), 1, 2) AS FLOAT)
                              + (1 - (CAST(SUBSTRING(CAST(pr.personal_best AS TEXT), 3, 5) AS FLOAT) / 3600))
                            )
                            /
                            ((99 - CAST(SUBSTRING(CAST(nr.national_best AS TEXT), 1, 2) AS FLOAT))
                              + (1 - (CAST(SUBSTRING(CAST(nr.national_best AS TEXT), 3, 5) AS FLOAT) / 3600))
                            )
                          ) * 100
                        ELSE 0
                      END
                    WHEN COALESCE(pr.personal_best, 0) != 0 THEN 
                      (nr.national_best / pr.personal_best::FLOAT) * 100
                    ELSE 0
                  END AS best_ratio
                FROM (
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
                ) pr
                JOIN persons p ON p.wca_id = pr.person_id
                LEFT JOIN (
                  SELECT
                    event_id,
                    MIN(best) AS national_best,
                    'average' AS type
                  FROM ranks_average
                  WHERE country_rank = 1 AND event_id NOT IN (${sql.join(EXCLUDED_EVENTS, sql`, `)})
                  GROUP BY event_id
                  UNION ALL
                  SELECT
                    event_id,
                    MIN(best) AS national_best,
                    'single' AS type
                  FROM ranks_single
                  WHERE country_rank = 1 AND event_id IN (${sql.join(SINGLE_EVENTS, sql`, `)})
                  GROUP BY event_id
                ) nr ON pr.event_id = nr.event_id AND pr.type = nr.type
              ),
              TeamKinch AS (
                SELECT
                  state_id,
                  event_id,
                  best_ratio AS team_ratio,
                  wca_id AS person_id,
                  name AS person_name
                FROM (
                  SELECT
                    pk.*,
                    ROW_NUMBER() OVER (PARTITION BY pk.state_id, pk.event_id ORDER BY pk.best_ratio DESC) AS rn
                  FROM PersonalKinch pk
                ) sub
                WHERE rn = 1
              )
              SELECT
                t.name,
                t.state_id,
                json_agg(
                  json_build_object(
                    'eventId', e.id,
                    'ratio', COALESCE(tk.team_ratio, 0),
                    'personId', tk.person_id,
                    'personName', tk.person_name
                  )
                  ORDER BY e.rank
                ) AS events,
                AVG(COALESCE(tk.team_ratio, 0)) AS overall
              FROM teams t
              CROSS JOIN events e
              LEFT JOIN TeamKinch tk ON t.state_id = tk.state_id AND e.id = tk.event_id
              WHERE e.id NOT IN (${sql.join(EXCLUDED_EVENTS, sql`, `)})
              GROUP BY t.name, t.state_id
              ORDER BY overall DESC;
            `,
    );

    return data as unknown as KinchRanksTeams[];
  } catch (err) {
    console.error(err);
    return [];
  }
}
