"use cache";

import "server-only";
import { db } from "@workspace/db";
import { ccEvent, ccResult } from "@workspace/db/schema";
import { and, asc, eq, gt, inArray, lte, or } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type {
  CcEventFormat,
  CcEventOption,
  CcEventResultsGroup,
  CcResultRow,
} from "@/lib/cubing-contests";
import {
  getCcResultRows,
  groupCcResultsByEvent,
  sortCcRowsByRound,
} from "@/lib/cubing-contests-queries";

/** Unofficial events with results at the competition, in Cubing Contests order. */
export async function getCompetitionCcEvents(
  competitionId: string,
): Promise<CcEventOption[]> {
  cacheLife("days");
  cacheTag("cc-results", `cc-competition-${competitionId}`);

  const rows = await db
    .select({
      id: ccEvent.id,
      name: ccEvent.name,
      format: ccEvent.format,
      participants: ccEvent.participants,
    })
    .from(ccResult)
    .innerJoin(ccEvent, eq(ccResult.eventId, ccEvent.id))
    .where(eq(ccResult.competitionId, competitionId))
    .groupBy(ccEvent.id)
    .orderBy(asc(ccEvent.rank), asc(ccEvent.id));

  return rows.map((row) => ({
    ...row,
    format: row.format as CcEventFormat,
  }));
}

export async function getCompetitionCcResults(
  competitionId: string,
  eventId: string,
): Promise<CcResultRow[]> {
  cacheLife("days");
  cacheTag("cc-results", `cc-competition-${competitionId}-${eventId}`);

  const rows = await getCcResultRows(
    and(
      eq(ccResult.competitionId, competitionId),
      eq(ccResult.eventId, eventId),
    )!,
  );
  return sortCcRowsByRound(rows);
}

/** Top three of each unofficial final, grouped by event. */
export async function getCompetitionCcPodiums(
  competitionId: string,
): Promise<CcEventResultsGroup[]> {
  cacheLife("days");
  cacheTag("cc-results", `cc-competition-podiums-${competitionId}`);

  const rows = await getCcResultRows(
    and(
      eq(ccResult.competitionId, competitionId),
      inArray(ccResult.roundTypeId, ["f", "c"]),
      lte(ccResult.pos, 3),
      or(gt(ccResult.best, 0), gt(ccResult.average, 0)),
    )!,
  );
  return groupCcResultsByEvent(rows).map((group) => ({
    ...group,
    results: group.results
      .slice()
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
  }));
}

/**
 * Unofficial results at the competition keyed by competitor WCA id (only
 * competitors in `persons`). Team results are listed under every member.
 */
export async function getCompetitionCcResultsByPerson(
  competitionId: string,
): Promise<Record<string, CcResultRow[]>> {
  cacheLife("days");
  cacheTag("cc-results", `cc-competition-by-person-${competitionId}`);

  const rows = await getCcResultRows(eq(ccResult.competitionId, competitionId));
  const byPerson: Record<string, CcResultRow[]> = {};
  for (const row of rows) {
    for (const competitor of row.competitors) {
      if (!competitor.wcaId) continue;
      (byPerson[competitor.wcaId] ??= []).push(row);
    }
  }
  return byPerson;
}
