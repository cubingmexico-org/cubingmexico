import "server-only";
import { db } from "@workspace/db";
import { sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

export type PersonNemesis = {
  wcaId: string;
  name: string | null;
  stateId: string | null;
  stateName: string | null;
};

export type NemesisSlot = {
  eventId: string;
  eventName: string;
  type: "single" | "average";
  targetBest: number;
  otherBest: number | null;
};

export type NemesisReport = {
  slotCount: number;
  nemeses: (PersonNemesis & { closest: NemesisSlot })[];
  almost: (PersonNemesis & { missing: NemesisSlot })[];
  almostTotal: number;
};

const ALMOST_NEMESES_LIMIT = 50;

type ReportRow = {
  slotCount: number;
  kind: "nemesis" | "almost" | null;
  wcaId: string;
  name: string | null;
  stateId: string | null;
  stateName: string | null;
  type: "single" | "average";
  eventId: string;
  eventName: string;
  targetBest: number;
  otherBest: number | null;
  almostTotal: number | null;
};

/** Best value per event id, WCA-encoded. */
export type RecordValues = Record<string, number>;

export type NemesisTargets = {
  singles: RecordValues;
  averages: RecordValues;
};

function targetValues({ singles, averages }: NemesisTargets): SQL[] {
  const rows = (type: "single" | "average", values: RecordValues) =>
    Object.entries(values)
      .filter(([, best]) => best > 0)
      .map(
        ([eventId, best]) =>
          sql`(${type}::text, ${eventId}::text, ${best}::int)`,
      );
  return [...rows("single", singles), ...rows("average", averages)];
}

export async function getPersonRecordValues(
  wcaId: string,
): Promise<NemesisTargets> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-nemeses-${wcaId}`);

  const [singleRows, averageRows] = await Promise.all([
    db.execute(sql`
      SELECT event_id AS "eventId", best FROM ranks_single
      WHERE person_id = ${wcaId} AND best > 0
    `),
    db.execute(sql`
      SELECT event_id AS "eventId", best FROM ranks_average
      WHERE person_id = ${wcaId} AND best > 0
    `),
  ]);

  const toRecord = (rows: unknown): RecordValues =>
    Object.fromEntries(
      (rows as Array<{ eventId: string; best: number }>).map((row) => [
        row.eventId,
        Number(row.best),
      ]),
    );

  return { singles: toRecord(singleRows), averages: toRecord(averageRows) };
}

export async function getNemesisReport(wcaId: string): Promise<NemesisReport> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-nemeses-${wcaId}`);

  const targets = await getPersonRecordValues(wcaId);
  return findNemesisReport({ ...targets, excludeWcaId: wcaId });
}

/**
 * A slot is an (event, single|average) pair in `singles` / `averages`.
 * Nemeses beat the target strictly in every slot; almost-nemeses in all but
 * one. For each nemesis, `closest` is the slot with the smallest relative gap
 * (333mbf last, since its encoded values can't be compared as a gap). For
 * each almost-nemesis, `missing` is the slot they don't beat.
 */
export async function findNemesisReport({
  excludeWcaId: wcaId,
  ...targets
}: NemesisTargets & { excludeWcaId: string }): Promise<NemesisReport> {
  "use cache";
  cacheLife("hours");

  const values = targetValues(targets);
  if (values.length === 0) {
    return { slotCount: 0, nemeses: [], almost: [], almostTotal: 0 };
  }

  const rows = await db.execute(sql`
    WITH target AS (
      SELECT type, event_id, best
      FROM (VALUES ${sql.join(values, sql`, `)}) AS v(type, event_id, best)
    ),
    total AS (
      SELECT COUNT(*)::int AS n FROM target
    ),
    cmp AS (
      SELECT r.person_id, t.type, t.event_id, t.best AS target_best, r.best AS other_best
      FROM target t
      JOIN ranks_single r
        ON t.type = 'single' AND r.event_id = t.event_id AND r.best > 0
      WHERE r.person_id <> ${wcaId}
      UNION ALL
      SELECT r.person_id, t.type, t.event_id, t.best AS target_best, r.best AS other_best
      FROM target t
      JOIN ranks_average r
        ON t.type = 'average' AND r.event_id = t.event_id AND r.best > 0
      WHERE r.person_id <> ${wcaId}
    ),
    counts AS (
      SELECT person_id,
        COUNT(*) FILTER (WHERE other_best < target_best)::int AS beaten
      FROM cmp
      GROUP BY person_id
    ),
    nemesis_closest AS (
      SELECT DISTINCT ON (c.person_id)
        c.person_id, c.type, c.event_id, c.target_best, c.other_best
      FROM cmp c
      JOIN counts k ON k.person_id = c.person_id
      CROSS JOIN total
      WHERE total.n > 0 AND k.beaten = total.n
      ORDER BY c.person_id,
        (c.event_id = '333mbf'),
        (c.target_best - c.other_best)::float / c.target_best
    ),
    almost_missing AS (
      SELECT k.person_id, t.type, t.event_id, t.best AS target_best, c.other_best
      FROM counts k
      CROSS JOIN total
      CROSS JOIN target t
      LEFT JOIN cmp c
        ON c.person_id = k.person_id AND c.type = t.type AND c.event_id = t.event_id
      WHERE total.n >= 2
        AND k.beaten = total.n - 1
        AND (c.other_best IS NULL OR c.other_best >= t.best)
    ),
    report AS (
      (
        SELECT 'nemesis'::text AS kind, n.person_id, n.type, n.event_id,
          n.target_best, n.other_best, NULL::int AS almost_total,
          NULL::bigint AS position, p.name AS person_name
        FROM nemesis_closest n
        JOIN persons p ON p.wca_id = n.person_id
      )
      UNION ALL
      (
        SELECT 'almost'::text AS kind, a.person_id, a.type, a.event_id,
          a.target_best, a.other_best, (COUNT(*) OVER ())::int AS almost_total,
          ROW_NUMBER() OVER (
            ORDER BY (a.other_best IS NULL),
              (a.event_id = '333mbf'),
              (a.other_best - a.target_best)::float / a.target_best,
              p.name
          ) AS position,
          p.name AS person_name
        FROM almost_missing a
        JOIN persons p ON p.wca_id = a.person_id
        ORDER BY position
        LIMIT ${ALMOST_NEMESES_LIMIT}
      )
    )
    SELECT
      total.n AS "slotCount",
      r.kind AS "kind",
      r.person_id AS "wcaId",
      r.person_name AS "name",
      p.state_id AS "stateId",
      s.name AS "stateName",
      r.type AS "type",
      r.event_id AS "eventId",
      e.name AS "eventName",
      r.target_best AS "targetBest",
      r.other_best AS "otherBest",
      r.almost_total AS "almostTotal"
    FROM total
    LEFT JOIN report r ON true
    LEFT JOIN persons p ON p.wca_id = r.person_id
    LEFT JOIN states s ON s.id = p.state_id
    LEFT JOIN events e ON e.id = r.event_id
    ORDER BY r.kind DESC, r.position, r.person_name
  `);

  const report: NemesisReport = {
    slotCount: 0,
    nemeses: [],
    almost: [],
    almostTotal: 0,
  };

  for (const row of rows as unknown as ReportRow[]) {
    report.slotCount = row.slotCount;
    if (!row.kind) continue;

    const person: PersonNemesis = {
      wcaId: row.wcaId,
      name: row.name,
      stateId: row.stateId,
      stateName: row.stateName,
    };
    const slot: NemesisSlot = {
      eventId: row.eventId,
      eventName: row.eventName,
      type: row.type,
      targetBest: row.targetBest,
      otherBest: row.otherBest,
    };

    if (row.kind === "nemesis") {
      report.nemeses.push({ ...person, closest: slot });
    } else {
      report.almost.push({ ...person, missing: slot });
      report.almostTotal = row.almostTotal ?? 0;
    }
  }

  return report;
}
