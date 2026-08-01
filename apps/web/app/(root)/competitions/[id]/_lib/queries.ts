"use cache";

import "server-only";
import { db } from "@workspace/db";
import { event, person, result, state } from "@workspace/db/schema";
import type { Competition } from "@/types/wca";
import { and, count, eq, gt, inArray, or } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

export interface CompetitionResultRow {
  resultId: string;
  eventId: string;
  eventName: string;
  eventRank: number;
  personId: string;
  personName: string | null;
  personState: string | null;
  roundTypeId: string | null;
  position: number | null;
  best: number;
  average: number;
  solves: number[];
}

export async function getWcaCompetitionData(
  competitionId: string,
): Promise<Competition | null> {
  cacheLife("weeks");
  cacheTag(`wca-competition-data-${competitionId}`);

  try {
    const response = await fetch(
      `https://www.worldcubeassociation.org/api/v0/competitions/${competitionId}`,
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function getCompetitionMainEventResults(
  competitionId: string,
  mainEventId?: string | null,
) {
  cacheLife("weeks");
  cacheTag(`competition-main-event-results-${competitionId}`);

  try {
    return await db.transaction(async (tx) => {
      const hasResultsCount = await tx
        .select({ value: count() })
        .from(result)
        .where(eq(result.competitionId, competitionId));

      const hasResults = (hasResultsCount[0]?.value ?? 0) > 0;

      if (!mainEventId) {
        return {
          hasResults,
          mainEventResults: [] as CompetitionResultRow[],
        };
      }

      const mainEventResults = await tx
        .select({
          resultId: result.id,
          eventId: result.eventId,
          eventName: event.name,
          eventRank: event.rank,
          personId: result.personId,
          personName: person.name,
          personState: state.name,
          roundTypeId: result.roundTypeId,
          position: result.pos,
          best: result.best,
          average: result.average,
        })
        .from(result)
        .innerJoin(event, eq(result.eventId, event.id))
        .innerJoin(person, eq(result.personId, person.wcaId))
        .leftJoin(state, eq(person.stateId, state.id))
        .where(
          and(
            eq(result.competitionId, competitionId),
            eq(result.eventId, mainEventId),
            inArray(result.roundTypeId, ["f", "c"]),
            or(gt(result.best, 0), gt(result.average, 0)),
          ),
        )
        .orderBy(result.pos);

      const top3 = mainEventResults
        .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
        .slice(0, 3);

      return {
        hasResults,
        mainEventResults: top3.map((row, index) => ({
          ...row,
          position: index + 1,
          solves: [],
        })),
      };
    });
  } catch (err) {
    console.error(err);
    return {
      hasResults: false,
      mainEventResults: [] as CompetitionResultRow[],
    };
  }
}
