import "server-only";

import { db } from "@workspace/db";
import {
  championship,
  competition,
  competitionDelegate,
  competitionOrganizer,
  delegate,
  event,
  organizer,
  result,
  state,
} from "@workspace/db/schema";
import { and, asc, desc, eq, gt, gte, inArray, lt, or, sql } from "drizzle-orm";
import type {
  ChampionshipPodiumRow,
  PrStreakCompetition,
  StaffCompetition,
  YearChampionshipPodiums,
  YearPrStreak,
  YearRecords,
  YearStaff,
} from "./types";
import {
  FEATURED_CHAMPIONSHIP_TYPES,
  assignChampionshipPositions,
  isPersonalRecord,
} from "./utils";

export async function computeYearRecords(
  wcaId: string,
  yearStart: Date,
  yearEnd: Date,
): Promise<YearRecords> {
  const yearFilter = and(
    eq(result.personId, wcaId),
    gte(competition.startDate, yearStart),
    lt(competition.startDate, yearEnd),
  );

  const [totals] = await db
    .select({
      wr: sql<number>`SUM((CASE WHEN ${result.regionalSingleRecord} = 'WR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.regionalAverageRecord} = 'WR' THEN 1 ELSE 0 END))::int`,
      nar: sql<number>`SUM((CASE WHEN ${result.regionalSingleRecord} = 'NAR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.regionalAverageRecord} = 'NAR' THEN 1 ELSE 0 END))::int`,
      nr: sql<number>`SUM((CASE WHEN ${result.regionalSingleRecord} = 'NR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.regionalAverageRecord} = 'NR' THEN 1 ELSE 0 END))::int`,
      sr: sql<number>`SUM((CASE WHEN ${result.stateSingleRecord} = 'SR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.stateAverageRecord} = 'SR' THEN 1 ELSE 0 END))::int`,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(yearFilter);

  const srRows = await db
    .select({
      eventId: result.eventId,
      eventName: event.name,
      eventRank: event.rank,
      single: sql<number>`COUNT(*) FILTER (WHERE ${result.stateSingleRecord} = 'SR')::int`,
      average: sql<number>`COUNT(*) FILTER (WHERE ${result.stateAverageRecord} = 'SR')::int`,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(event, eq(result.eventId, event.id))
    .where(
      and(
        yearFilter,
        or(
          eq(result.stateSingleRecord, "SR"),
          eq(result.stateAverageRecord, "SR"),
        ),
      ),
    )
    .groupBy(result.eventId, event.name, event.rank)
    .orderBy(asc(event.rank));

  return {
    wr: Number(totals?.wr ?? 0),
    nar: Number(totals?.nar ?? 0),
    nr: Number(totals?.nr ?? 0),
    sr: Number(totals?.sr ?? 0),
    byEventSr: srRows
      .map((row) => ({
        eventId: row.eventId,
        eventName: row.eventName,
        eventRank: row.eventRank,
        single: Number(row.single),
        average: Number(row.average),
      }))
      .filter((row) => row.single + row.average > 0),
  };
}

export async function computeYearChampionshipPodiums(
  wcaId: string,
  yearStart: Date,
  yearEnd: Date,
): Promise<YearChampionshipPodiums> {
  const rows = await db
    .select({
      resultId: result.id,
      eventId: result.eventId,
      eventName: event.name,
      competitionId: result.competitionId,
      competitionName: competition.name,
      championshipType: championship.championshipType,
      pos: result.pos,
    })
    .from(result)
    .innerJoin(event, eq(result.eventId, event.id))
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(championship, eq(championship.competitionId, competition.id))
    .where(
      and(
        eq(result.personId, wcaId),
        gte(competition.startDate, yearStart),
        lt(competition.startDate, yearEnd),
        inArray(result.roundTypeId, ["f", "c"]),
        gt(result.best, 0),
        inArray(championship.championshipType, [
          ...FEATURED_CHAMPIONSHIP_TYPES,
        ]),
      ),
    )
    .orderBy(desc(competition.startDate), asc(event.rank));

  if (rows.length === 0) {
    return { total: 0, mx: 0, nac: 0, world: 0, rows: [] };
  }

  const mxCompetitionIds = [
    ...new Set(
      rows
        .filter((row) => row.championshipType === "MX")
        .map((row) => row.competitionId),
    ),
  ];

  const mxChampionshipPosByResultId = new Map<string, number>();

  if (mxCompetitionIds.length > 0) {
    const peers = await db
      .select({
        resultId: result.id,
        competitionId: result.competitionId,
        eventId: result.eventId,
        roundTypeId: result.roundTypeId,
        pos: result.pos,
      })
      .from(result)
      .innerJoin(
        championship,
        eq(championship.competitionId, result.competitionId),
      )
      .where(
        and(
          inArray(result.competitionId, mxCompetitionIds),
          inArray(result.roundTypeId, ["f", "c"]),
          gt(result.best, 0),
          eq(championship.championshipType, "MX"),
        ),
      );

    const groups = new Map<string, typeof peers>();
    for (const peer of peers) {
      const key = `${peer.competitionId}|${peer.eventId}|${peer.roundTypeId}`;
      const group = groups.get(key) ?? [];
      group.push(peer);
      groups.set(key, group);
    }

    for (const group of groups.values()) {
      for (const ranked of assignChampionshipPositions(group)) {
        mxChampionshipPosByResultId.set(
          ranked.resultId,
          ranked.championshipPosition,
        );
      }
    }
  }

  const podiumRows: ChampionshipPodiumRow[] = [];

  for (const row of rows) {
    let position: number | null = row.pos;
    if (row.championshipType === "MX") {
      position = mxChampionshipPosByResultId.get(row.resultId) ?? null;
    }
    if (position === null || position < 1 || position > 3) continue;

    podiumRows.push({
      eventId: row.eventId,
      eventName: row.eventName,
      championshipType: row.championshipType,
      competitionName: row.competitionName,
      position,
    });
  }

  return {
    total: podiumRows.length,
    mx: podiumRows.filter((r) => r.championshipType === "MX").length,
    nac: podiumRows.filter((r) => r.championshipType === "_North America")
      .length,
    world: podiumRows.filter((r) => r.championshipType === "world").length,
    rows: podiumRows,
  };
}

export async function computeYearStaff(
  wcaId: string,
  yearStart: Date,
  yearEnd: Date,
): Promise<YearStaff> {
  const yearFilter = and(
    gte(competition.startDate, yearStart),
    lt(competition.startDate, yearEnd),
  );

  const staffSelect = {
    id: competition.id,
    name: competition.name,
    startDate: competition.startDate,
    cityName: competition.cityName,
    stateName: state.name,
  };

  const [organized, delegated] = await Promise.all([
    db
      .select(staffSelect)
      .from(organizer)
      .innerJoin(
        competitionOrganizer,
        eq(competitionOrganizer.organizerId, organizer.id),
      )
      .innerJoin(
        competition,
        eq(competitionOrganizer.competitionId, competition.id),
      )
      .leftJoin(state, eq(competition.stateId, state.id))
      .where(and(eq(organizer.personId, wcaId), yearFilter))
      .groupBy(
        competition.id,
        competition.name,
        competition.startDate,
        competition.cityName,
        state.name,
      )
      .orderBy(desc(competition.startDate)),
    db
      .select(staffSelect)
      .from(delegate)
      .innerJoin(
        competitionDelegate,
        eq(competitionDelegate.delegateId, delegate.id),
      )
      .innerJoin(
        competition,
        eq(competitionDelegate.competitionId, competition.id),
      )
      .leftJoin(state, eq(competition.stateId, state.id))
      .where(and(eq(delegate.personId, wcaId), yearFilter))
      .groupBy(
        competition.id,
        competition.name,
        competition.startDate,
        competition.cityName,
        state.name,
      )
      .orderBy(desc(competition.startDate)),
  ]);

  const mapRow = (row: (typeof organized)[number]): StaffCompetition => ({
    id: row.id,
    name: row.name,
    startDate: row.startDate.toISOString(),
    cityName: row.cityName,
    stateName: row.stateName,
  });

  return {
    organized: organized.map(mapRow),
    delegated: delegated.map(mapRow),
  };
}

export async function computeYearPrStreak(
  wcaId: string,
  yearStart: Date,
  yearEnd: Date,
): Promise<YearPrStreak> {
  const rows = await db
    .select({
      competitionId: result.competitionId,
      eventId: result.eventId,
      best: result.best,
      average: result.average,
      competitionName: competition.name,
      startDate: competition.startDate,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(eq(result.personId, wcaId))
    .orderBy(asc(competition.startDate), asc(result.competitionId));

  if (rows.length === 0) return null;

  type CompMeta = {
    competitionId: string;
    competitionName: string;
    startDate: Date;
    results: Array<{ eventId: string; best: number; average: number }>;
  };

  const competitions: CompMeta[] = [];
  let currentComp: CompMeta | null = null;

  for (const row of rows) {
    if (!currentComp || currentComp.competitionId !== row.competitionId) {
      currentComp = {
        competitionId: row.competitionId,
        competitionName: row.competitionName,
        startDate: row.startDate,
        results: [],
      };
      competitions.push(currentComp);
    }
    currentComp.results.push({
      eventId: row.eventId,
      best: row.best,
      average: row.average,
    });
  }

  const bestSingles: Record<string, number> = {};
  const bestAverages: Record<string, number> = {};
  let currentStreak: PrStreakCompetition[] = [];
  let longestInYear: PrStreakCompetition[] = [];

  const yearStartMs = yearStart.getTime();
  const yearEndMs = yearEnd.getTime();

  for (const comp of competitions) {
    let recordAttained = false;

    for (const entry of comp.results) {
      if (isPersonalRecord(entry.eventId, entry.best, bestSingles)) {
        bestSingles[entry.eventId] = entry.best;
        recordAttained = true;
      }
      if (isPersonalRecord(entry.eventId, entry.average, bestAverages)) {
        bestAverages[entry.eventId] = entry.average;
        recordAttained = true;
      }
    }

    const startMs = comp.startDate.getTime();
    const inYear = startMs >= yearStartMs && startMs < yearEndMs;
    if (!inYear) continue;

    const streakComp: PrStreakCompetition = {
      competitionId: comp.competitionId,
      competitionName: comp.competitionName,
      startDate: comp.startDate.toISOString(),
    };

    if (recordAttained) {
      currentStreak = [...currentStreak, streakComp];
      if (currentStreak.length > longestInYear.length) {
        longestInYear = currentStreak;
      }
    } else {
      currentStreak = [];
    }
  }

  if (longestInYear.length === 0) return null;

  return {
    length: longestInYear.length,
    competitions: longestInYear,
  };
}
