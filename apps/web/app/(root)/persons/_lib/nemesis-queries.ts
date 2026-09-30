import "server-only";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

export type PersonNemesis = {
  wcaId: string;
  name: string | null;
  stateId: string | null;
  stateName: string | null;
};

/**
 * People with a strictly better single in every event where `wcaId` has a
 * single, and a strictly better average in every event where `wcaId` has an
 * average.
 */
export async function getPersonNemeses(
  wcaId: string,
): Promise<PersonNemesis[]> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-nemeses-${wcaId}`);

  const rows = await db.execute(sql`
    WITH target_single AS (
      SELECT event_id, best FROM ranks_single
      WHERE person_id = ${wcaId} AND best > 0
    ),
    target_average AS (
      SELECT event_id, best FROM ranks_average
      WHERE person_id = ${wcaId} AND best > 0
    ),
    single_beaters AS (
      SELECT r.person_id
      FROM ranks_single r
      JOIN target_single t
        ON r.event_id = t.event_id AND r.best > 0 AND r.best < t.best
      WHERE r.person_id <> ${wcaId}
      GROUP BY r.person_id
      HAVING COUNT(*) = (SELECT COUNT(*) FROM target_single)
    ),
    average_beaters AS (
      SELECT r.person_id
      FROM ranks_average r
      JOIN target_average t
        ON r.event_id = t.event_id AND r.best > 0 AND r.best < t.best
      WHERE r.person_id <> ${wcaId}
      GROUP BY r.person_id
      HAVING COUNT(*) = (SELECT COUNT(*) FROM target_average)
    )
    SELECT
      p.wca_id AS "wcaId",
      p.name AS "name",
      p.state_id AS "stateId",
      s.name AS "stateName"
    FROM single_beaters sb
    JOIN persons p ON p.wca_id = sb.person_id
    LEFT JOIN states s ON s.id = p.state_id
    WHERE (SELECT COUNT(*) FROM target_average) = 0
      OR sb.person_id IN (SELECT person_id FROM average_beaters)
    ORDER BY p.name
  `);

  return (rows as unknown as PersonNemesis[]).map((row) => ({
    wcaId: row.wcaId,
    name: row.name,
    stateId: row.stateId,
    stateName: row.stateName,
  }));
}
