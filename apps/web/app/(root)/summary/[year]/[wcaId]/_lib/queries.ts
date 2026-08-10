import "server-only";

import { db } from "@workspace/db";
import {
  competition,
  event,
  person,
  result,
  resultAttempts,
  state,
} from "@workspace/db/schema";
import { roundRank } from "@/lib/utils";
import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  gte,
  lt,
  ne,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import {
  computeRankProgress,
  computeTeammates,
  computeTravelKm,
  computeYearChampionshipPodiums,
  computeYearKinchSor,
  computeYearMollerz,
  computeYearPrStreak,
  computeYearRecords,
  computeYearStaff,
  enhanceStatesWithFirstTime,
  type SharedCuber,
  type StateVisits,
  type YearChampionshipPodiums,
  type YearKinchSor,
  type YearMollerz,
  type YearPrStreak,
  type YearRecords,
  type YearStaff,
  type YearStates,
  type RankProgressRow,
} from "./summary-extra";

export type { SharedCuber, StateVisits };

export type AnnualSummaryPerson = {
  wcaId: string;
  name: string | null;
  gender: "m" | "f" | "o" | null;
  stateId: string | null;
};

export type PodiumByEvent = {
  eventId: string;
  eventName: string;
  eventRank: number;
  gold: number;
  silver: number;
  bronze: number;
};

export type SolvesByEvent = {
  eventId: string;
  eventName: string;
  eventRank: number;
  solves: number;
  attempts: number;
};

export type PrBreaksByEvent = {
  eventId: string;
  eventName: string;
  eventRank: number;
  times: number;
  single: number;
  average: number;
};

export type PrImprovement = {
  eventId: string;
  eventName: string;
  eventRank: number;
  before: number | null;
  during: number;
  improvement: number | null;
  improvementPercent: number | null;
};

export type SharedCompetitionBucket = {
  sharedCompetitions: number;
  competitors: number;
};

export type AnnualSummary = {
  person: AnnualSummaryPerson;
  year: number;
  availableYears: number[];
  competitionCount: number;
  roundCount: number;
  eventCount: number;
  firstCompetitionDate: string;
  lastCompetitionDate: string;
  podiums: {
    total: number;
    events: number;
    gold: number;
    silver: number;
    bronze: number;
    byEvent: PodiumByEvent[];
  };
  records: YearRecords;
  championshipPodiums: YearChampionshipPodiums;
  prStreak: YearPrStreak;
  solves: {
    totalSolves: number;
    totalAttempts: number;
    byEvent: SolvesByEvent[];
  };
  personalBests: {
    totalBreaks: number;
    events: number;
    singleBreaks: number;
    averageBreaks: number;
    byEvent: PrBreaksByEvent[];
    singleImprovements: PrImprovement[];
    averageImprovements: PrImprovement[];
  };
  cubers: {
    total: number;
    repeated: number;
    topShared: SharedCuber[];
    distribution: SharedCompetitionBucket[];
    teammates: SharedCuber[];
  };
  states: YearStates;
  travelKm: number | null;
  rankProgress: RankProgressRow[];
  kinchSor: YearKinchSor;
  mollerz: YearMollerz;
  staff: YearStaff;
};

function yearBounds(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

function isBetterResult(value: number, previousBest: number): boolean {
  return previousBest === 0 || value < previousBest;
}

/** Current-year summaries unlock on this UTC day-of-month in December. */
const CURRENT_YEAR_SUMMARY_UNLOCK_DAY = 20;

/**
 * Past years are always published. The current calendar year only becomes
 * available in the last days of December (from the 20th UTC onward).
 */
export function isSummaryYearPublished(
  year: number,
  now: Date = new Date(),
): boolean {
  const currentYear = now.getUTCFullYear();
  if (year < currentYear) return true;
  if (year > currentYear) return false;

  const month = now.getUTCMonth(); // 0-indexed
  const day = now.getUTCDate();
  return month === 11 && day >= CURRENT_YEAR_SUMMARY_UNLOCK_DAY;
}

async function getCompetedSummaryYears(wcaId: string): Promise<number[]> {
  "use cache";
  cacheLife("days");
  cacheTag(`person-summary-years-${wcaId}`);

  try {
    const yearSql = sql<number>`EXTRACT(YEAR FROM ${competition.startDate} AT TIME ZONE 'UTC')::int`;

    const rows = await db
      .select({ year: yearSql })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(eq(result.personId, wcaId))
      .groupBy(yearSql)
      .orderBy(desc(yearSql));

    return rows
      .map((row) => Number(row.year))
      .filter((year) => !Number.isNaN(year));
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function getAvailableSummaryYears(
  wcaId: string,
): Promise<number[]> {
  const years = await getCompetedSummaryYears(wcaId);
  return years.filter((year) => isSummaryYearPublished(year));
}

export async function getLatestSummaryYear(
  wcaId: string,
): Promise<number | null> {
  const years = await getAvailableSummaryYears(wcaId);
  return years[0] ?? null;
}

async function getAnnualSummaryCached(
  wcaId: string,
  year: number,
): Promise<AnnualSummary | null> {
  "use cache";
  cacheLife("days");
  cacheTag(`person-summary-v6-${year}-${wcaId}`);

  try {
    const [personRow] = await db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        gender: person.gender,
        stateId: person.stateId,
      })
      .from(person)
      .where(eq(person.wcaId, wcaId))
      .limit(1);

    if (!personRow) {
      return null;
    }

    const competedYears = await getCompetedSummaryYears(wcaId);
    if (!competedYears.includes(year)) {
      return null;
    }

    // availableYears is filled by the non-cached wrapper
    const availableYears: number[] = [];

    const { start: yearStart, end: yearEnd } = yearBounds(year);

    const yearCompFilter = and(
      eq(result.personId, wcaId),
      gte(competition.startDate, yearStart),
      lt(competition.startDate, yearEnd),
    );

    const [introRow] = await db
      .select({
        competitionCount: countDistinct(result.competitionId),
        roundCount: sql<number>`COUNT(*)::int`,
        eventCount: countDistinct(result.eventId),
        firstCompetitionDate: sql<string>`MIN(${competition.startDate})`,
        lastCompetitionDate: sql<string>`MAX(${competition.endDate})`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(yearCompFilter);

    const competitionCount = Number(introRow?.competitionCount ?? 0);
    if (competitionCount === 0) {
      return null;
    }

    const podiumRows = await db
      .select({
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1)::int`,
        silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2)::int`,
        bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3)::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(
        and(
          yearCompFilter,
          sql`${result.roundTypeId} IN ('f', 'c')`,
          sql`${result.pos} IN (1, 2, 3)`,
          sql`${result.best} > 0`,
        ),
      )
      .groupBy(result.eventId, event.name, event.rank)
      .orderBy(asc(event.rank));

    const byEventPodiums: PodiumByEvent[] = podiumRows
      .map((row) => ({
        eventId: row.eventId,
        eventName: row.eventName,
        eventRank: row.eventRank,
        gold: Number(row.gold),
        silver: Number(row.silver),
        bronze: Number(row.bronze),
      }))
      .filter((row) => row.gold + row.silver + row.bronze > 0)
      .sort((a, b) => {
        const totalDiff =
          b.gold + b.silver + b.bronze - (a.gold + a.silver + a.bronze);
        if (totalDiff !== 0) return totalDiff;
        if (b.gold !== a.gold) return b.gold - a.gold;
        if (b.silver !== a.silver) return b.silver - a.silver;
        return a.eventRank - b.eventRank;
      });

    const gold = byEventPodiums.reduce((sum, row) => sum + row.gold, 0);
    const silver = byEventPodiums.reduce((sum, row) => sum + row.silver, 0);
    const bronze = byEventPodiums.reduce((sum, row) => sum + row.bronze, 0);

    const solveRows = await db
      .select({
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        solves: sql<number>`COUNT(*) FILTER (WHERE ${resultAttempts.value} > 0)::int`,
        // Count successful solves and DNFs; DNS (-2) is not an attempt.
        attempts: sql<number>`COUNT(*) FILTER (WHERE ${resultAttempts.value} > 0 OR ${resultAttempts.value} = -1)::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(event, eq(result.eventId, event.id))
      .innerJoin(resultAttempts, eq(resultAttempts.resultId, result.id))
      .where(yearCompFilter)
      .groupBy(result.eventId, event.name, event.rank)
      .orderBy(
        desc(
          sql`COUNT(*) FILTER (WHERE ${resultAttempts.value} > 0 OR ${resultAttempts.value} = -1)`,
        ),
        asc(event.rank),
      );

    const byEventSolves: SolvesByEvent[] = solveRows.map((row) => ({
      eventId: row.eventId,
      eventName: row.eventName,
      eventRank: row.eventRank,
      solves: Number(row.solves),
      attempts: Number(row.attempts),
    }));

    const totalSolves = byEventSolves.reduce((sum, row) => sum + row.solves, 0);
    const totalAttempts = byEventSolves.reduce(
      (sum, row) => sum + row.attempts,
      0,
    );

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
      .where(eq(result.personId, wcaId))
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
        if (row.best > 0) {
          if (
            stateForEvent.bestSingleBefore === 0 ||
            row.best < stateForEvent.bestSingleBefore
          ) {
            stateForEvent.bestSingleBefore = row.best;
          }
        }
        if (row.average > 0) {
          if (
            stateForEvent.bestAverageBefore === 0 ||
            row.average < stateForEvent.bestAverageBefore
          ) {
            stateForEvent.bestAverageBefore = row.average;
          }
        }
      }

      if (inYear) {
        if (row.best > 0) {
          if (
            stateForEvent.bestSingleDuring === 0 ||
            row.best < stateForEvent.bestSingleDuring
          ) {
            stateForEvent.bestSingleDuring = row.best;
          }
        }
        if (row.average > 0) {
          if (
            stateForEvent.bestAverageDuring === 0 ||
            row.average < stateForEvent.bestAverageDuring
          ) {
            stateForEvent.bestAverageDuring = row.average;
          }
        }
      }
    }

    const prStates = Array.from(prByEvent.values());

    const byEventPrBreaks: PrBreaksByEvent[] = prStates
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

    const singleImprovements: PrImprovement[] = prStates
      .filter((s) => {
        if (s.bestSingleDuring === 0) return false;
        if (s.bestSingleBefore === 0) return true;
        return s.bestSingleDuring < s.bestSingleBefore;
      })
      .map((s) => {
        const before = s.bestSingleBefore === 0 ? null : s.bestSingleBefore;
        const during = s.bestSingleDuring;
        const improvement = before === null ? null : before - during;
        const improvementPercent =
          before === null || before === 0
            ? null
            : (improvement! / before) * 100;
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

    const averageImprovements: PrImprovement[] = prStates
      .filter((s) => {
        if (s.bestAverageDuring === 0) return false;
        if (s.bestAverageBefore === 0) return true;
        return s.bestAverageDuring < s.bestAverageBefore;
      })
      .map((s) => {
        const before = s.bestAverageBefore === 0 ? null : s.bestAverageBefore;
        const during = s.bestAverageDuring;
        const improvement = before === null ? null : before - during;
        const improvementPercent =
          before === null || before === 0
            ? null
            : (improvement! / before) * 100;
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

    const singleBreaks = byEventPrBreaks.reduce(
      (sum, row) => sum + row.single,
      0,
    );
    const averageBreaks = byEventPrBreaks.reduce(
      (sum, row) => sum + row.average,
      0,
    );

    const personComps = db
      .$with("person_comps")
      .as(
        db
          .selectDistinct({ competitionId: result.competitionId })
          .from(result)
          .innerJoin(competition, eq(result.competitionId, competition.id))
          .where(yearCompFilter),
      );

    const sharedRows = await db
      .with(personComps)
      .select({
        wcaId: result.personId,
        name: person.name,
        sharedCompetitions: countDistinct(result.competitionId),
      })
      .from(result)
      .innerJoin(
        personComps,
        eq(result.competitionId, personComps.competitionId),
      )
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(ne(result.personId, wcaId))
      .groupBy(result.personId, person.name)
      .orderBy(desc(countDistinct(result.competitionId)), asc(person.name));

    const sharedCubers: SharedCuber[] = sharedRows.map((row) => ({
      wcaId: row.wcaId,
      name: row.name,
      sharedCompetitions: Number(row.sharedCompetitions),
    }));

    const distributionMap = new Map<number, number>();
    for (const cuber of sharedCubers) {
      distributionMap.set(
        cuber.sharedCompetitions,
        (distributionMap.get(cuber.sharedCompetitions) ?? 0) + 1,
      );
    }

    const distribution: SharedCompetitionBucket[] = Array.from(
      distributionMap.entries(),
    )
      .map(([sharedCompetitions, competitors]) => ({
        sharedCompetitions,
        competitors,
      }))
      .sort((a, b) => a.sharedCompetitions - b.sharedCompetitions);

    const repeated = sharedCubers.filter(
      (c) => c.sharedCompetitions > 1,
    ).length;

    const stateRows = await db
      .select({
        stateId: competition.stateId,
        stateName: state.name,
        times: countDistinct(competition.id),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(state, eq(competition.stateId, state.id))
      .where(yearCompFilter)
      .groupBy(competition.stateId, state.name)
      .orderBy(desc(countDistinct(competition.id)), asc(state.name));

    let states: StateVisits[] = stateRows
      .filter(
        (row): row is typeof row & { stateId: string } => row.stateId !== null,
      )
      .map((row) => ({
        stateId: row.stateId,
        stateName: row.stateName,
        times: Number(row.times),
      }));

    // Fallback when competitions lack state_id: match state names inside city_name
    if (states.length === 0) {
      const cityRows = await db
        .select({
          competitionId: competition.id,
          cityName: competition.cityName,
        })
        .from(result)
        .innerJoin(competition, eq(result.competitionId, competition.id))
        .where(and(yearCompFilter, eq(competition.countryId, "Mexico")))
        .groupBy(competition.id, competition.cityName);

      const allStates = await db
        .select({ id: state.id, name: state.name })
        .from(state)
        .orderBy(desc(sql`LENGTH(${state.name})`));

      const counts = new Map<string, { stateName: string; times: number }>();

      for (const row of cityRows) {
        const city = row.cityName ?? "";
        const matched = allStates.find((s) =>
          city.toLowerCase().includes(s.name.toLowerCase()),
        );
        if (!matched) continue;
        const existing = counts.get(matched.id);
        if (existing) {
          existing.times += 1;
        } else {
          counts.set(matched.id, { stateName: matched.name, times: 1 });
        }
      }

      states = Array.from(counts.entries())
        .map(([stateId, value]) => ({
          stateId,
          stateName: value.stateName,
          times: value.times,
        }))
        .sort(
          (a, b) =>
            b.times - a.times || a.stateName.localeCompare(b.stateName, "es"),
        );
    }

    const statesEnhanced = await enhanceStatesWithFirstTime(
      wcaId,
      yearStart,
      states,
    );

    const [
      records,
      championshipPodiums,
      prStreak,
      travelKm,
      teammates,
      rankProgress,
      mollerz,
      kinchSor,
      staff,
    ] = await Promise.all([
      computeYearRecords(wcaId, yearStart, yearEnd),
      computeYearChampionshipPodiums(wcaId, yearStart, yearEnd),
      computeYearPrStreak(wcaId, yearStart, yearEnd),
      computeTravelKm(wcaId, yearStart, yearEnd),
      computeTeammates(wcaId, personRow.stateId, sharedCubers),
      computeRankProgress(wcaId, personRow.stateId, yearStart, yearEnd),
      computeYearMollerz(wcaId, yearStart, yearEnd),
      computeYearKinchSor(wcaId, yearStart, yearEnd),
      computeYearStaff(wcaId, yearStart, yearEnd),
    ]);

    return {
      person: {
        wcaId: personRow.wcaId,
        name: personRow.name,
        gender: personRow.gender,
        stateId: personRow.stateId,
      },
      year,
      availableYears,
      competitionCount,
      roundCount: Number(introRow?.roundCount ?? 0),
      eventCount: Number(introRow?.eventCount ?? 0),
      firstCompetitionDate: String(introRow?.firstCompetitionDate ?? ""),
      lastCompetitionDate: String(introRow?.lastCompetitionDate ?? ""),
      podiums: {
        total: gold + silver + bronze,
        events: byEventPodiums.length,
        gold,
        silver,
        bronze,
        byEvent: byEventPodiums,
      },
      records,
      championshipPodiums,
      prStreak,
      solves: {
        totalSolves,
        totalAttempts,
        byEvent: byEventSolves,
      },
      personalBests: {
        totalBreaks: singleBreaks + averageBreaks,
        events: byEventPrBreaks.length,
        singleBreaks,
        averageBreaks,
        byEvent: byEventPrBreaks,
        singleImprovements,
        averageImprovements,
      },
      cubers: {
        total: sharedCubers.length,
        repeated,
        topShared: sharedCubers.slice(0, 10),
        distribution,
        teammates,
      },
      states: statesEnhanced,
      travelKm,
      rankProgress,
      kinchSor,
      mollerz,
      staff,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function getAnnualSummary(
  wcaId: string,
  year: number,
): Promise<AnnualSummary | null> {
  if (!isSummaryYearPublished(year)) {
    return null;
  }

  const summary = await getAnnualSummaryCached(wcaId, year);
  if (!summary) {
    return null;
  }

  const availableYears = await getAvailableSummaryYears(wcaId);
  return { ...summary, availableYears };
}
