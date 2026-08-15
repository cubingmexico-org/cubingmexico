"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  competition,
  event,
  person,
  result,
  state,
} from "@workspace/db/schema";
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

async function fetchWcaCompetition(competitionId: string): Promise<Response> {
  const url = `https://www.worldcubeassociation.org/api/v0/competitions/${competitionId}`;
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url);

    if (response.ok || response.status === 404) {
      return response;
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === maxAttempts) {
      return response;
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const delayMs = Number.isFinite(retryAfter)
      ? retryAfter * 1000
      : 500 * 2 ** (attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return fetch(url);
}

export async function getWcaCompetitionData(
  competitionId: string,
): Promise<Competition | null> {
  // v2: avoid reusing nulls cached from transient WCA failures.
  cacheTag(`wca-competition-data-v2-${competitionId}`);

  const response = await fetchWcaCompetition(competitionId);

  // Only real 404s are "not found". Other failures must not be cached as null.
  if (response.status === 404) {
    cacheLife("minutes");
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch WCA competition ${competitionId}: ${response.status} ${response.statusText}`,
    );
  }

  cacheLife("weeks");
  return response.json();
}

/** Cubing México Neon `competitions.logo` (UploadThing / imported URL). */
export async function getCompetitionLogo(
  competitionId: string,
): Promise<string | null> {
  cacheLife("weeks");
  cacheTag(`competition-logo-${competitionId}`);

  const row = await db.query.competition.findFirst({
    where: eq(competition.id, competitionId),
    columns: { logo: true },
  });
  const logo = row?.logo?.trim();
  return logo || null;
}

export async function getCompetitionMainEventResults(
  competitionId: string,
  mainEventId?: string | null,
) {
  cacheLife("weeks");
  cacheTag(`competition-main-event-results-${competitionId}`);

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
}
