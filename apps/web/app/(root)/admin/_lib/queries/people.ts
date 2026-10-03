import "server-only";

import { db } from "@workspace/db";
import { person, teamMember } from "@workspace/db/schema";
import { accentInsensitiveContains } from "@/lib/search";
import { asc, eq, or, sql } from "drizzle-orm";

export async function searchPersons(search: string, limit = 20) {
  const term = search.trim();
  if (!term) {
    return [];
  }

  return await db
    .select({
      wcaId: person.wcaId,
      name: person.name,
      stateId: person.stateId,
      role: teamMember.role,
    })
    .from(person)
    .leftJoin(teamMember, eq(person.wcaId, teamMember.personId))
    .where(
      or(
        accentInsensitiveContains(person.name, term),
        accentInsensitiveContains(person.wcaId, term),
      ),
    )
    .orderBy(asc(person.name))
    .limit(limit);
}

export type PersonStateGuessConfidence = "high" | "medium" | "none";

export type PersonStateGuess = {
  wcaId: string;
  name: string | null;
  suggestedStateId: string | null;
  suggestedStateName: string | null;
  suggestedComps: number;
  totalMxComps: number;
  share: number;
  firstStateId: string | null;
  confidence: PersonStateGuessConfidence;
  breakdown: string;
  countryRank333: number | null;
  competitionCount: number;
};

export async function getPersonStateGuesses({
  limit = 10,
  confidence,
}: {
  limit?: number;
  confidence?: PersonStateGuessConfidence | "all";
} = {}): Promise<PersonStateGuess[]> {
  const confidenceFilter =
    confidence && confidence !== "all"
      ? sql`WHERE confidence = ${confidence}`
      : sql``;

  const rows = (await db.execute(sql`
    WITH mx AS (
      SELECT DISTINCT
        r.person_id,
        c.state_id,
        c.id AS competition_id,
        c.start_date
      FROM results r
      JOIN competitions c ON c.id = r.competition_id
      WHERE c.country_id = 'Mexico'
        AND c.state_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM championships ch
          WHERE ch.competition_id = c.id
            AND ch.championship_type = 'MX'
        )
    ),
    counts AS (
      SELECT
        person_id,
        state_id,
        COUNT(*)::int AS comps,
        MAX(start_date) AS last_comp
      FROM mx
      GROUP BY person_id, state_id
    ),
    agg AS (
      SELECT
        person_id,
        SUM(comps)::int AS total_mx,
        MAX(last_comp) AS last_mx_comp
      FROM counts
      GROUP BY person_id
    ),
    ranked AS (
      SELECT
        c.person_id,
        c.state_id AS mode_state_id,
        c.comps AS mode_comps,
        a.total_mx,
        a.last_mx_comp,
        (c.comps::numeric / a.total_mx) AS share,
        ROW_NUMBER() OVER (
          PARTITION BY c.person_id
          ORDER BY c.comps DESC, c.last_comp DESC
        ) AS rn
      FROM counts c
      JOIN agg a ON a.person_id = c.person_id
    ),
    mode_guess AS (
      SELECT *
      FROM ranked
      WHERE rn = 1
    ),
    first_guess AS (
      SELECT DISTINCT ON (person_id)
        person_id,
        state_id AS first_state_id
      FROM mx
      ORDER BY person_id, start_date ASC
    ),
    breakdown AS (
      SELECT
        person_id,
        string_agg(
          comps::text || ' ' || state_id,
          ' · '
          ORDER BY comps DESC, state_id ASC
        ) AS breakdown
      FROM counts
      GROUP BY person_id
    ),
    all_comps AS (
      SELECT
        person_id,
        COUNT(DISTINCT competition_id)::int AS competition_count
      FROM results
      GROUP BY person_id
    ),
    candidates AS (
      SELECT
        p.wca_id AS "wcaId",
        p.name,
        mg.mode_state_id AS "suggestedStateId",
        st.name AS "suggestedStateName",
        COALESCE(mg.mode_comps, 0)::int AS "suggestedComps",
        COALESCE(mg.total_mx, 0)::int AS "totalMxComps",
        COALESCE(mg.share, 0)::float8 AS share,
        fg.first_state_id AS "firstStateId",
        COALESCE(bd.breakdown, '') AS breakdown,
        ra.country_rank AS "countryRank333",
        COALESCE(ac.competition_count, 0)::int AS "competitionCount",
        mg.last_mx_comp AS "lastMxComp",
        CASE
          WHEN (
            mg.total_mx >= 3
            AND mg.share >= 0.7
            AND fg.first_state_id = mg.mode_state_id
          )
            OR (mg.total_mx >= 2 AND mg.share = 1.0)
            THEN 'high'
          WHEN mg.total_mx >= 3 AND mg.share >= 0.5 THEN 'medium'
          ELSE 'none'
        END AS confidence
      FROM persons p
      INNER JOIN mode_guess mg ON mg.person_id = p.wca_id
      LEFT JOIN first_guess fg ON fg.person_id = p.wca_id
      LEFT JOIN breakdown bd ON bd.person_id = p.wca_id
      LEFT JOIN states st ON st.id = mg.mode_state_id
      LEFT JOIN ranks_average ra
        ON ra.person_id = p.wca_id AND ra.event_id = '333'
      LEFT JOIN all_comps ac ON ac.person_id = p.wca_id
      WHERE p.state_id IS NULL
        AND mg.total_mx > 0
    )
    SELECT
      "wcaId",
      name,
      "suggestedStateId",
      "suggestedStateName",
      "suggestedComps",
      "totalMxComps",
      share,
      "firstStateId",
      confidence,
      breakdown,
      "countryRank333",
      "competitionCount"
    FROM candidates
    ${confidenceFilter}
    ORDER BY
      CASE confidence
        WHEN 'high' THEN 0
        WHEN 'medium' THEN 1
        ELSE 2
      END ASC,
      "countryRank333" ASC NULLS LAST,
      "competitionCount" DESC,
      "lastMxComp" DESC NULLS LAST,
      "wcaId" ASC
    LIMIT ${limit}
  `)) as unknown as Array<{
    wcaId: string;
    name: string | null;
    suggestedStateId: string | null;
    suggestedStateName: string | null;
    suggestedComps: number;
    totalMxComps: number;
    share: number;
    firstStateId: string | null;
    confidence: PersonStateGuessConfidence;
    breakdown: string;
    countryRank333: number | null;
    competitionCount: number;
  }>;

  return rows.map((row) => ({
    wcaId: row.wcaId,
    name: row.name,
    suggestedStateId: row.suggestedStateId,
    suggestedStateName: row.suggestedStateName,
    suggestedComps: Number(row.suggestedComps ?? 0),
    totalMxComps: Number(row.totalMxComps ?? 0),
    share: Number(row.share ?? 0),
    firstStateId: row.firstStateId,
    confidence: row.confidence,
    breakdown: row.breakdown ?? "",
    countryRank333:
      row.countryRank333 == null ? null : Number(row.countryRank333),
    competitionCount: Number(row.competitionCount ?? 0),
  }));
}

export async function getTeamMembersWithRoles(stateId: string) {
  return await db
    .select({
      wcaId: person.wcaId,
      name: person.name,
      role: teamMember.role,
      hideFromRoster: person.hideFromRoster,
    })
    .from(person)
    .leftJoin(teamMember, eq(person.wcaId, teamMember.personId))
    .where(eq(person.stateId, stateId))
    .orderBy(
      sql`CASE WHEN ${teamMember.role} IS NULL THEN 1 ELSE 0 END`,
      asc(person.name),
    );
}
