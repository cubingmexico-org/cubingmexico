import { sql, type SQL } from "drizzle-orm";
import { result } from "@workspace/db/schema";

/**
 * WCA-aligned medal eligibility (before dual-round merge) for drizzle `result` refs.
 *
 * Prefer {@link mergedPodiumRowsSql} when displaying medal totals so dual pairs
 * are not double-counted. This form is fine for filters / sorts.
 */
export function medalEligibleSql(alias: typeof result = result): SQL {
  return sql`(
    ${alias.best} > 0
    AND ${alias.globalPos} IN (1, 2, 3)
    AND (
      ${alias.roundTypeId} IN ('f', 'c')
      OR (
        ${alias.isDual} = true
        AND EXISTS (
          SELECT 1
          FROM results _medal_dual_final
          WHERE _medal_dual_final.competition_id = ${alias.competitionId}
            AND _medal_dual_final.event_id = ${alias.eventId}
            AND _medal_dual_final.is_dual = true
            AND _medal_dual_final.round_type_id IN ('f', 'c')
        )
      )
    )
  )`;
}

/**
 * WCA-aligned medal eligibility (before dual-round merge), using SQL alias `r`.
 */
export function medalEligibleSqlR(): SQL {
  return sql.raw(`(
    r.best > 0
    AND r.global_pos IN (1, 2, 3)
    AND (
      r.round_type_id IN ('f', 'c')
      OR (
        r.is_dual = true
        AND EXISTS (
          SELECT 1
          FROM results _medal_dual_final
          WHERE _medal_dual_final.competition_id = r.competition_id
            AND _medal_dual_final.event_id = r.event_id
            AND _medal_dual_final.is_dual = true
            AND _medal_dual_final.round_type_id IN ('f', 'c')
        )
      )
    )
  )`);
}

/**
 * ORDER BY keys that keep the better dual-round solve per person/comp/event
 * (WCA `merged_dual_rounds`). Expects results alias `r` and formats `f`.
 */
export function mergedPodiumOrderSql(): SQL {
  return sql.raw(`
    (CASE WHEN COALESCE(f.sort_by, 'single') = 'average'
          THEN r.average ELSE r.best END) <= 0,
    (CASE WHEN COALESCE(f.sort_by, 'single') = 'average'
          THEN r.average ELSE r.best END) ASC,
    r.best <= 0,
    r.best ASC,
    r.id ASC
  `);
}

/** Gold / silver / bronze from merged podium rows (`rn = 1`). */
export function medalTierCountsFromMergedSql(): {
  gold: SQL<number>;
  silver: SQL<number>;
  bronze: SQL<number>;
} {
  return {
    gold: sql<number>`COUNT(*) FILTER (WHERE ranked.global_pos = 1)`,
    silver: sql<number>`COUNT(*) FILTER (WHERE ranked.global_pos = 2)`,
    bronze: sql<number>`COUNT(*) FILTER (WHERE ranked.global_pos = 3)`,
  };
}

/**
 * Inner SELECT that picks one podium row per person/comp/event.
 * `extraWhere` is AND-ed into the eligibility filter (use `r.` columns).
 */
export function mergedPodiumRowsSql(extraWhere?: SQL): SQL {
  return sql`
    SELECT
      r.id,
      r.person_id,
      r.competition_id,
      r.event_id,
      r.global_pos,
      r.pos,
      r.best,
      r.average,
      r.round_type_id,
      r.is_dual,
      ROW_NUMBER() OVER (
        PARTITION BY r.competition_id, r.event_id, r.person_id
        ORDER BY ${mergedPodiumOrderSql()}
      ) AS rn
    FROM results r
    LEFT JOIN formats f ON f.id = r.format_id
    WHERE ${medalEligibleSqlR()}
      ${extraWhere ? sql`AND ${extraWhere}` : sql``}
  `;
}
