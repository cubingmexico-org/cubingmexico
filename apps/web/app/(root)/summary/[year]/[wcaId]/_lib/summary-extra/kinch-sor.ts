import "server-only";

import { db } from "@workspace/db";
import { competition, event, result } from "@workspace/db/schema";
import { EXCLUDED_EVENTS, SINGLE_EVENTS } from "@/lib/constants";
import { and, eq, gt, inArray, lte, notInArray, sql } from "drizzle-orm";
import type { YearKinchSor } from "./types";
import { dayBefore, mbfScore } from "./utils";

export async function getAsOfPbs(asOf: Date): Promise<{
  personSingles: Map<string, Map<string, number>>;
  personAverages: Map<string, Map<string, number>>;
  nationalSingles: Map<string, number>;
  nationalAverages: Map<string, number>;
  eventIds: string[];
}> {
  const events = await db
    .select({ id: event.id })
    .from(event)
    .where(
      and(sql`${event.rank} < 200`, notInArray(event.id, EXCLUDED_EVENTS)),
    );

  const eventIds = events.map((e) => e.id);
  const asOfCond = lte(competition.startDate, asOf);

  const singleRows = await db
    .select({
      personId: result.personId,
      eventId: result.eventId,
      best: sql<number>`min(${result.best})`,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(and(gt(result.best, 0), asOfCond, inArray(result.eventId, eventIds)))
    .groupBy(result.personId, result.eventId);

  const averageRows = await db
    .select({
      personId: result.personId,
      eventId: result.eventId,
      best: sql<number>`min(${result.average})`,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(
      and(gt(result.average, 0), asOfCond, inArray(result.eventId, eventIds)),
    )
    .groupBy(result.personId, result.eventId);

  const personSingles = new Map<string, Map<string, number>>();
  const personAverages = new Map<string, Map<string, number>>();
  const nationalSingles = new Map<string, number>();
  const nationalAverages = new Map<string, number>();

  for (const row of singleRows) {
    const byEvent = personSingles.get(row.personId) ?? new Map();
    byEvent.set(row.eventId, Number(row.best));
    personSingles.set(row.personId, byEvent);

    const current = nationalSingles.get(row.eventId);
    const value = Number(row.best);
    if (current === undefined || value < current) {
      nationalSingles.set(row.eventId, value);
    }
  }

  for (const row of averageRows) {
    const byEvent = personAverages.get(row.personId) ?? new Map();
    byEvent.set(row.eventId, Number(row.best));
    personAverages.set(row.personId, byEvent);

    const current = nationalAverages.get(row.eventId);
    const value = Number(row.best);
    if (current === undefined || value < current) {
      nationalAverages.set(row.eventId, value);
    }
  }

  return {
    personSingles,
    personAverages,
    nationalSingles,
    nationalAverages,
    eventIds,
  };
}

function computeKinchForPerson(
  wcaId: string,
  data: Awaited<ReturnType<typeof getAsOfPbs>>,
): number {
  const singles = data.personSingles.get(wcaId) ?? new Map();
  const averages = data.personAverages.get(wcaId) ?? new Map();
  const singleEventSet = new Set(SINGLE_EVENTS);

  const ratios: number[] = [];

  for (const eventId of data.eventIds) {
    const useSingle = singleEventSet.has(eventId);
    const pb = useSingle ? singles.get(eventId) : averages.get(eventId);
    const nr = useSingle
      ? data.nationalSingles.get(eventId)
      : data.nationalAverages.get(eventId);

    if (!pb || !nr || pb <= 0 || nr <= 0) {
      ratios.push(0);
      continue;
    }

    if (eventId === "333mbf") {
      const pbScore = mbfScore(pb);
      const nrScore = mbfScore(nr);
      ratios.push(nrScore === 0 ? 0 : (pbScore / nrScore) * 100);
    } else {
      ratios.push((nr / pb) * 100);
    }
  }

  if (ratios.length === 0) return 0;
  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
}

function computeSorForPerson(
  wcaId: string,
  data: Awaited<ReturnType<typeof getAsOfPbs>>,
  kind: "single" | "average",
): number {
  const personMap =
    kind === "single" ? data.personSingles : data.personAverages;
  const personPbs = personMap.get(wcaId) ?? new Map();

  // Build country ranks per event from all PBs
  let overall = 0;

  for (const eventId of data.eventIds) {
    if (kind === "average" && SINGLE_EVENTS.includes(eventId)) {
      continue;
    }
    if (kind === "single" && !SINGLE_EVENTS.includes(eventId)) {
      // SoR single typically includes all events' singles
    }

    const allValues: number[] = [];
    for (const [, byEvent] of personMap) {
      const value = byEvent.get(eventId);
      if (value !== undefined) allValues.push(value);
    }
    allValues.sort((a, b) => a - b);

    const pb = personPbs.get(eventId);
    if (pb === undefined) {
      overall += allValues.length + 1;
      continue;
    }

    const rank = allValues.findIndex((v) => v === pb) + 1;
    overall += rank > 0 ? rank : allValues.length + 1;
  }

  return overall;
}

export async function computeYearKinchSor(
  wcaId: string,
  yearStart: Date,
  yearEnd: Date,
): Promise<YearKinchSor> {
  const beforeDate = dayBefore(yearStart);
  const afterDate = dayBefore(yearEnd);

  const [before, after] = await Promise.all([
    getAsOfPbs(beforeDate),
    getAsOfPbs(afterDate),
  ]);

  return {
    kinchBefore: Number(computeKinchForPerson(wcaId, before).toFixed(2)),
    kinchAfter: Number(computeKinchForPerson(wcaId, after).toFixed(2)),
    sorSingleBefore: computeSorForPerson(wcaId, before, "single"),
    sorSingleAfter: computeSorForPerson(wcaId, after, "single"),
    sorAverageBefore: computeSorForPerson(wcaId, before, "average"),
    sorAverageAfter: computeSorForPerson(wcaId, after, "average"),
  };
}

type AsOfPbs = Awaited<ReturnType<typeof getAsOfPbs>>;

function kinchRatioForPb(
  eventId: string,
  pb: number,
  nr: number | undefined,
): number {
  if (!nr || pb <= 0 || nr <= 0) return 0;
  if (eventId === "333mbf") {
    const pbScore = mbfScore(pb);
    const nrScore = mbfScore(nr);
    return nrScore === 0 ? 0 : (pbScore / nrScore) * 100;
  }
  return (nr / pb) * 100;
}

function computeKinchForTeam(memberIds: string[], data: AsOfPbs): number {
  if (memberIds.length === 0 || data.eventIds.length === 0) return 0;

  const memberSet = new Set(memberIds);
  const singleEventSet = new Set(SINGLE_EVENTS);
  const ratios: number[] = [];

  for (const eventId of data.eventIds) {
    const useSingle = singleEventSet.has(eventId);
    const personMap = useSingle ? data.personSingles : data.personAverages;
    const nr = useSingle
      ? data.nationalSingles.get(eventId)
      : data.nationalAverages.get(eventId);

    let bestRatio = 0;
    for (const memberId of memberSet) {
      const pb = personMap.get(memberId)?.get(eventId);
      if (pb === undefined) continue;
      const ratio = kinchRatioForPb(eventId, pb, nr);
      if (ratio > bestRatio) bestRatio = ratio;
    }
    ratios.push(bestRatio);
  }

  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
}

function computeSorForTeam(
  memberIds: string[],
  data: AsOfPbs,
  kind: "single" | "average",
): number {
  if (memberIds.length === 0) return 0;

  const memberSet = new Set(memberIds);
  const personMap =
    kind === "single" ? data.personSingles : data.personAverages;

  let overall = 0;

  for (const eventId of data.eventIds) {
    if (kind === "average" && SINGLE_EVENTS.includes(eventId)) {
      continue;
    }

    const allValues: number[] = [];
    for (const [, byEvent] of personMap) {
      const value = byEvent.get(eventId);
      if (value !== undefined) allValues.push(value);
    }
    allValues.sort((a, b) => a - b);
    const worst = allValues.length + 1;

    let bestRank = worst;
    for (const memberId of memberSet) {
      const pb = personMap.get(memberId)?.get(eventId);
      if (pb === undefined) continue;
      const rank = allValues.findIndex((v) => v === pb) + 1;
      const resolved = rank > 0 ? rank : worst;
      if (resolved < bestRank) bestRank = resolved;
    }
    overall += bestRank;
  }

  return overall;
}

/**
 * Team Kinch / SoR before→after for a state roster.
 * Uses best member per event (same model as live team Kinch and team SoR pages).
 */
export async function computeTeamYearKinchSor(
  memberIds: string[],
  yearStart: Date,
  yearEnd: Date,
): Promise<YearKinchSor> {
  const beforeDate = dayBefore(yearStart);
  const afterDate = dayBefore(yearEnd);

  const [before, after] = await Promise.all([
    getAsOfPbs(beforeDate),
    getAsOfPbs(afterDate),
  ]);

  return {
    kinchBefore: Number(computeKinchForTeam(memberIds, before).toFixed(2)),
    kinchAfter: Number(computeKinchForTeam(memberIds, after).toFixed(2)),
    sorSingleBefore: computeSorForTeam(memberIds, before, "single"),
    sorSingleAfter: computeSorForTeam(memberIds, after, "single"),
    sorAverageBefore: computeSorForTeam(memberIds, before, "average"),
    sorAverageAfter: computeSorForTeam(memberIds, after, "average"),
  };
}
