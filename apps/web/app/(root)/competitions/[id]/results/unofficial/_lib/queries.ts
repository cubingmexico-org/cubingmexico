"use cache";

import "server-only";
import { db } from "@workspace/db";
import { ccEvent, ccResult } from "@workspace/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type {
  CcEventFormat,
  CcEventOption,
  CcResultRow,
} from "@/lib/cubing-contests";
import {
  getCcResultRows,
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
