import "server-only";

import { db } from "@workspace/db";
import { competition, event, result } from "@workspace/db/schema";
import { inOfficialEvents } from "@/lib/official-events";
import { roundRank } from "@/lib/utils";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type {
  PrBreaksByEvent,
  PrImprovement,
  YearPersonalBests,
} from "./types";

type EventPrState = {
  eventId: string;
  eventName: string;
  eventRank: number;
  bestSingleBefore: number;
  bestAverageBefore: number;
  bestSingleDuring: number;
  bestAverageDuring: number;
  singleBreaks: number;
  averageBreaks: number;
  currentBestSingle: number;
  currentBestAverage: number;
};

function isBetterResult(value: number, previousBest: number): boolean {
  return previousBest === 0 || value < previousBest;
}

function lowerPositive(value: number, currentBest: number): number {
  return value > 0 && isBetterResult(value, currentBest) ? value : currentBest;
}

function toImprovements(
  prStates: EventPrState[],
  kind: "Single" | "Average",
): PrImprovement[] {
  return prStates
    .filter((s) => {
      const during = s[`best${kind}During`];
      const before = s[`best${kind}Before`];
      if (during === 0) return false;
      if (before === 0) return true;
      return during < before;
    })
    .map((s) => {
      const bestBefore = s[`best${kind}Before`];
      const before = bestBefore === 0 ? null : bestBefore;
      const during = s[`best${kind}During`];
      const improvement = before === null ? null : before - during;
      const improvementPercent =
        before === null || before === 0 ? null : (improvement! / before) * 100;
      return {
        eventId: s.eventId,
        eventName: s.eventName,
        eventRank: s.eventRank,
        before,
        during,
        improvement,
        improvementPercent,
      };
    })
    .sort((a, b) => {
      const ap = a.improvementPercent ?? Number.NEGATIVE_INFINITY;
      const bp = b.improvementPercent ?? Number.NEGATIVE_INFINITY;
      if (ap !== bp) return bp - ap;
      return a.eventRank - b.eventRank;
    });
}

/** Replays the person's official history to count PR breaks and improvements within the year. */
export async function computeYearPersonalBests(
  wcaId: string,
  yearStart: Date,
  yearEnd: Date,
): Promise<YearPersonalBests> {
  const historyRows = await db
    .select({
      eventId: result.eventId,
      eventName: event.name,
      eventRank: event.rank,
      competitionStartDate: competition.startDate,
      roundTypeId: result.roundTypeId,
      position: result.pos,
      best: result.best,
      average: result.average,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(event, eq(result.eventId, event.id))
    .where(and(eq(result.personId, wcaId), inOfficialEvents(result.eventId)))
    .orderBy(
      asc(competition.startDate),
      desc(sql`CASE
        WHEN ${result.roundTypeId} IN ('f', 'c') THEN 0
        WHEN ${result.roundTypeId} IN ('2', 'e') THEN 1
        WHEN ${result.roundTypeId} IN ('1', 'd') THEN 2
        ELSE 3
      END`),
      asc(result.pos),
      asc(result.best),
    );

  const yearStartMs = yearStart.getTime();
  const yearEndMs = yearEnd.getTime();

  const prByEvent = new Map<string, EventPrState>();

  const chronological = historyRows.slice().sort((a, b) => {
    const dateDelta =
      new Date(a.competitionStartDate).getTime() -
      new Date(b.competitionStartDate).getTime();
    if (dateDelta !== 0) return dateDelta;

    const roundDelta = roundRank(b.roundTypeId) - roundRank(a.roundTypeId);
    if (roundDelta !== 0) return roundDelta;

    return (a.position ?? 999) - (b.position ?? 999) || a.best - b.best;
  });

  for (const row of chronological) {
    let stateForEvent = prByEvent.get(row.eventId);
    if (!stateForEvent) {
      stateForEvent = {
        eventId: row.eventId,
        eventName: row.eventName,
        eventRank: row.eventRank,
        bestSingleBefore: 0,
        bestAverageBefore: 0,
        bestSingleDuring: 0,
        bestAverageDuring: 0,
        singleBreaks: 0,
        averageBreaks: 0,
        currentBestSingle: 0,
        currentBestAverage: 0,
      };
      prByEvent.set(row.eventId, stateForEvent);
    }

    const startMs = new Date(row.competitionStartDate).getTime();
    const inYear = startMs >= yearStartMs && startMs < yearEndMs;
    const beforeYear = startMs < yearStartMs;

    if (
      row.best > 0 &&
      isBetterResult(row.best, stateForEvent.currentBestSingle)
    ) {
      if (inYear) {
        stateForEvent.singleBreaks += 1;
      }
      stateForEvent.currentBestSingle = row.best;
    }

    if (
      row.average > 0 &&
      isBetterResult(row.average, stateForEvent.currentBestAverage)
    ) {
      if (inYear) {
        stateForEvent.averageBreaks += 1;
      }
      stateForEvent.currentBestAverage = row.average;
    }

    if (beforeYear) {
      stateForEvent.bestSingleBefore = lowerPositive(
        row.best,
        stateForEvent.bestSingleBefore,
      );
      stateForEvent.bestAverageBefore = lowerPositive(
        row.average,
        stateForEvent.bestAverageBefore,
      );
    }

    if (inYear) {
      stateForEvent.bestSingleDuring = lowerPositive(
        row.best,
        stateForEvent.bestSingleDuring,
      );
      stateForEvent.bestAverageDuring = lowerPositive(
        row.average,
        stateForEvent.bestAverageDuring,
      );
    }
  }

  const prStates = Array.from(prByEvent.values());

  const byEvent: PrBreaksByEvent[] = prStates
    .map((s) => ({
      eventId: s.eventId,
      eventName: s.eventName,
      eventRank: s.eventRank,
      times: s.singleBreaks + s.averageBreaks,
      single: s.singleBreaks,
      average: s.averageBreaks,
    }))
    .filter((s) => s.times > 0)
    .sort((a, b) => {
      if (b.times !== a.times) return b.times - a.times;
      return a.eventRank - b.eventRank;
    });

  const singleBreaks = byEvent.reduce((sum, row) => sum + row.single, 0);
  const averageBreaks = byEvent.reduce((sum, row) => sum + row.average, 0);

  return {
    totalBreaks: singleBreaks + averageBreaks,
    events: byEvent.length,
    singleBreaks,
    averageBreaks,
    byEvent,
    singleImprovements: toImprovements(prStates, "Single"),
    averageImprovements: toImprovements(prStates, "Average"),
  };
}
