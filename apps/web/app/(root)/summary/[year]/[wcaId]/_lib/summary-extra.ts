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
  person,
  result,
  state,
} from "@workspace/db/schema";
import {
  BLD_FMC_MEANS_EVENTS,
  EXCLUDED_EVENTS,
  SINGLE_EVENTS,
  SPEEDSOLVING_AVERAGES_EVENTS,
} from "@/lib/constants";
import { getTier } from "@/lib/utils";
import type { Tier } from "@/types";
import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  lte,
  ne,
  notInArray,
  or,
  sql,
} from "drizzle-orm";

export type SharedCuber = {
  wcaId: string;
  name: string | null;
  sharedCompetitions: number;
};

export type StateVisits = {
  stateId: string;
  stateName: string;
  times: number;
};

export type RecordByEvent = {
  eventId: string;
  eventName: string;
  eventRank: number;
  single: number;
  average: number;
};

export type YearRecords = {
  wr: number;
  nar: number;
  nr: number;
  sr: number;
  byEventSr: RecordByEvent[];
};

export type ChampionshipPodiumRow = {
  eventId: string;
  eventName: string;
  championshipType: string;
  competitionName: string;
  position: number;
};

export type YearChampionshipPodiums = {
  total: number;
  mx: number;
  nac: number;
  world: number;
  rows: ChampionshipPodiumRow[];
};

export type StaffCompetition = {
  id: string;
  name: string;
  startDate: string;
  cityName: string;
  stateName: string | null;
};

export type YearStaff = {
  organized: StaffCompetition[];
  delegated: StaffCompetition[];
};

export type PrStreakCompetition = {
  competitionId: string;
  competitionName: string;
  startDate: string;
};

export type YearPrStreak = {
  length: number;
  competitions: PrStreakCompetition[];
} | null;

export type YearStates = {
  visits: StateVisits[];
  firstTime: StateVisits[];
};

export type RankProgressRow = {
  eventId: string;
  eventName: string;
  eventRank: number;
  type: "single" | "average";
  nrBefore: number | null;
  nrAfter: number | null;
  srBefore: number | null;
  srAfter: number | null;
};

export type MollerzConditions = {
  numberOfSpeedsolvingAverages: number;
  numberOfBLDFMCMeans: number;
  hasWorldRecord: boolean;
  hasWorldChampionshipPodium: boolean;
  eventsWon: number;
};

export type YearMollerz = {
  tierBefore: Tier | null;
  tierAfter: Tier | null;
  conditionsBefore: MollerzConditions | null;
  conditionsAfter: MollerzConditions;
} | null;

export type YearKinchSor = {
  kinchBefore: number;
  kinchAfter: number;
  sorSingleBefore: number;
  sorSingleAfter: number;
  sorAverageBefore: number;
  sorAverageAfter: number;
};

const FEATURED_CHAMPIONSHIP_TYPES = ["MX", "_North America", "world"] as const;

function assignChampionshipPositions<
  T extends { resultId: string; pos: number | null },
>(rows: T[]): (T & { championshipPosition: number })[] {
  const sorted = [...rows].sort(
    (a, b) =>
      (a.pos ?? Number.MAX_SAFE_INTEGER) - (b.pos ?? Number.MAX_SAFE_INTEGER),
  );

  let previousOldPos: number | null = null;
  let previousNewPos = 0;

  return sorted.map((row, index) => {
    const oldPos = row.pos ?? Number.MAX_SAFE_INTEGER;
    const championshipPosition =
      oldPos === previousOldPos ? previousNewPos : index + 1;
    previousOldPos = oldPos;
    previousNewPos = championshipPosition;
    return { ...row, championshipPosition };
  });
}

function isPersonalRecord(
  eventId: string,
  value: number,
  records: Record<string, number>,
): boolean {
  if (value <= 0) return false;
  if (records[eventId] === undefined) return true;
  return value <= records[eventId]!;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

function dayBefore(date: Date): Date {
  return new Date(date.getTime() - 24 * 60 * 60 * 1000);
}

function mbfScore(value: number): number {
  const str = value.toString().padStart(9, "0");
  const dd = Number(str.slice(0, 2));
  const ttttt = Number(str.slice(2, 7));
  return 99 - dd + (1 - ttttt / 3600);
}

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

export async function computeTravelKm(
  wcaId: string,
  yearStart: Date,
  yearEnd: Date,
): Promise<number | null> {
  const comps = await db
    .select({
      id: competition.id,
      startDate: competition.startDate,
      lat: competition.latitudeMicrodegrees,
      lng: competition.longitudeMicrodegrees,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(
      and(
        eq(result.personId, wcaId),
        gte(competition.startDate, yearStart),
        lt(competition.startDate, yearEnd),
      ),
    )
    .groupBy(
      competition.id,
      competition.startDate,
      competition.latitudeMicrodegrees,
      competition.longitudeMicrodegrees,
    )
    .orderBy(asc(competition.startDate));

  const points = comps
    .map((c) => ({
      lat: (c.lat ?? 0) / 1_000_000,
      lng: (c.lng ?? 0) / 1_000_000,
    }))
    .filter((p) => p.lat !== 0 || p.lng !== 0);

  if (points.length < 2) return null;

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(
      points[i - 1]!.lat,
      points[i - 1]!.lng,
      points[i]!.lat,
      points[i]!.lng,
    );
  }

  return Math.round(total);
}

export async function enhanceStatesWithFirstTime(
  wcaId: string,
  yearStart: Date,
  yearVisits: StateVisits[],
): Promise<YearStates> {
  if (yearVisits.length === 0) {
    return { visits: [], firstTime: [] };
  }

  const priorRows = await db
    .select({
      stateId: competition.stateId,
      cityName: competition.cityName,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(
      and(
        eq(result.personId, wcaId),
        lt(competition.startDate, yearStart),
        eq(competition.countryId, "Mexico"),
      ),
    )
    .groupBy(competition.stateId, competition.cityName);

  const priorIds = new Set<string>();
  const allStates = await db
    .select({ id: state.id, name: state.name })
    .from(state)
    .orderBy(desc(sql`LENGTH(${state.name})`));

  for (const row of priorRows) {
    if (row.stateId) {
      priorIds.add(row.stateId);
      continue;
    }
    const city = row.cityName ?? "";
    const matched = allStates.find((s) =>
      city.toLowerCase().includes(s.name.toLowerCase()),
    );
    if (matched) priorIds.add(matched.id);
  }

  const firstTime = yearVisits.filter((v) => !priorIds.has(v.stateId));

  return { visits: yearVisits, firstTime };
}

export async function computeTeammates(
  wcaId: string,
  stateId: string | null,
  sharedCubers: SharedCuber[],
): Promise<SharedCuber[]> {
  if (!stateId || sharedCubers.length === 0) return [];

  const teammateIds = await db
    .select({ wcaId: person.wcaId })
    .from(person)
    .where(and(eq(person.stateId, stateId), ne(person.wcaId, wcaId)));

  const teammateSet = new Set(teammateIds.map((t) => t.wcaId));
  return sharedCubers.filter((c) => teammateSet.has(c.wcaId)).slice(0, 10);
}

async function getAsOfPersonRanks(
  wcaId: string,
  stateId: string | null,
  asOf: Date,
  kind: "single" | "average",
): Promise<
  Map<
    string,
    { eventName: string; eventRank: number; nr: number; sr: number | null }
  >
> {
  const valueCol = kind === "single" ? result.best : result.average;
  const asOfCond = lte(competition.startDate, asOf);

  const pbs = db.$with("pbs").as(
    db
      .select({
        personId: result.personId,
        eventId: result.eventId,
        best: sql<number>`min(${valueCol})`.as("best"),
        stateId: person.stateId,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(and(gt(valueCol, 0), asOfCond))
      .groupBy(result.personId, result.eventId, person.stateId),
  );

  const ranked = db.$with("ranked").as(
    db
      .select({
        personId: pbs.personId,
        eventId: pbs.eventId,
        stateId: pbs.stateId,
        nr: sql<number>`rank() over (partition by ${pbs.eventId} order by ${pbs.best})`.as(
          "nr",
        ),
        sr: sql<
          number | null
        >`CASE WHEN ${pbs.stateId} IS NULL THEN NULL ELSE rank() over (partition by ${pbs.eventId}, ${pbs.stateId} order by ${pbs.best}) END`.as(
          "sr",
        ),
      })
      .from(pbs),
  );

  const rows = await db
    .with(pbs, ranked)
    .select({
      eventId: ranked.eventId,
      eventName: event.name,
      eventRank: event.rank,
      nr: ranked.nr,
      sr: ranked.sr,
    })
    .from(ranked)
    .innerJoin(event, eq(ranked.eventId, event.id))
    .where(eq(ranked.personId, wcaId));

  const map = new Map<
    string,
    { eventName: string; eventRank: number; nr: number; sr: number | null }
  >();

  for (const row of rows) {
    map.set(row.eventId, {
      eventName: row.eventName,
      eventRank: row.eventRank,
      nr: Number(row.nr),
      sr:
        stateId && row.sr !== null && row.sr !== undefined
          ? Number(row.sr)
          : null,
    });
  }

  return map;
}

export async function computeRankProgress(
  wcaId: string,
  stateId: string | null,
  yearStart: Date,
  yearEnd: Date,
): Promise<RankProgressRow[]> {
  const beforeDate = dayBefore(yearStart);
  const afterDate = dayBefore(yearEnd);

  const [singleBefore, singleAfter, averageBefore, averageAfter] =
    await Promise.all([
      getAsOfPersonRanks(wcaId, stateId, beforeDate, "single"),
      getAsOfPersonRanks(wcaId, stateId, afterDate, "single"),
      getAsOfPersonRanks(wcaId, stateId, beforeDate, "average"),
      getAsOfPersonRanks(wcaId, stateId, afterDate, "average"),
    ]);

  const rows: RankProgressRow[] = [];

  const collect = (
    type: "single" | "average",
    before: typeof singleBefore,
    after: typeof singleAfter,
  ) => {
    const eventIds = new Set([...before.keys(), ...after.keys()]);
    for (const eventId of eventIds) {
      const b = before.get(eventId);
      const a = after.get(eventId);
      if (!a) continue;

      const nrImproved = a.nr !== null && (b?.nr == null || a.nr < b.nr);
      const srImproved =
        a.sr !== null && (b?.sr == null || (b.sr !== null && a.sr < b.sr));

      if (!nrImproved && !srImproved) continue;

      rows.push({
        eventId,
        eventName: a.eventName,
        eventRank: a.eventRank,
        type,
        nrBefore: b?.nr ?? null,
        nrAfter: a.nr,
        srBefore: b?.sr ?? null,
        srAfter: a.sr,
      });
    }
  };

  collect("single", singleBefore, singleAfter);
  collect("average", averageBefore, averageAfter);

  return rows.sort(
    (x, y) => x.eventRank - y.eventRank || x.type.localeCompare(y.type),
  );
}

async function getMembershipAsOf(
  wcaId: string,
  eventIds: string[],
  asOf: Date | null,
): Promise<MollerzConditions | null> {
  const dateFilter = asOf ? lte(competition.startDate, asOf) : undefined;

  const data = await db
    .select({
      numberOfSpeedsolvingAverages: sql<number>`COUNT(DISTINCT CASE WHEN ${result.eventId} IN(${sql.join(SPEEDSOLVING_AVERAGES_EVENTS, sql`, `)}) AND ${result.average} > 0 THEN ${result.eventId} ELSE NULL END)`,
      numberOfBLDFMCMeans: sql<number>`COUNT(DISTINCT CASE WHEN ${result.eventId} IN(${sql.join(BLD_FMC_MEANS_EVENTS, sql`, `)}) AND ${result.average} > 0 THEN ${result.eventId} ELSE NULL END)`,
      hasWorldRecord: sql<boolean>`MAX(CASE WHEN ${result.regionalSingleRecord} = 'WR' OR ${result.regionalAverageRecord} = 'WR' THEN 1 ELSE 0 END) = 1`,
      hasWorldChampionshipPodium: sql<boolean>`MAX(CASE WHEN ${result.pos} IN(1, 2, 3) AND ${result.roundTypeId} IN('f', 'c') AND ${championship.championshipType} = 'world' THEN 1 ELSE 0 END) = 1`,
      eventsWon: sql<number>`COUNT(DISTINCT CASE WHEN ${result.pos} = 1 AND ${result.roundTypeId} IN('f', 'c') THEN ${result.eventId} ELSE NULL END)`,
      eventCount: countDistinct(result.eventId),
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .leftJoin(
      championship,
      eq(result.competitionId, championship.competitionId),
    )
    .where(
      and(
        eq(result.personId, wcaId),
        inArray(result.eventId, eventIds),
        gt(result.best, 0),
        dateFilter,
      ),
    );

  const row = data[0];
  if (!row || Number(row.eventCount) < eventIds.length) return null;

  return {
    numberOfSpeedsolvingAverages: Number(row.numberOfSpeedsolvingAverages),
    numberOfBLDFMCMeans: Number(row.numberOfBLDFMCMeans),
    hasWorldRecord: Boolean(row.hasWorldRecord),
    hasWorldChampionshipPodium: Boolean(row.hasWorldChampionshipPodium),
    eventsWon: Number(row.eventsWon),
  };
}

export async function computeYearMollerz(
  wcaId: string,
  yearStart: Date,
  yearEnd: Date,
): Promise<YearMollerz> {
  const events = await db
    .select({ id: event.id })
    .from(event)
    .where(sql`${event.rank} < 200`);

  const eventIds = events.map((e) => e.id);
  if (eventIds.length === 0) return null;

  const beforeDate = dayBefore(yearStart);
  const afterDate = dayBefore(yearEnd);

  const [conditionsBefore, conditionsAfter] = await Promise.all([
    getMembershipAsOf(wcaId, eventIds, beforeDate),
    getMembershipAsOf(wcaId, eventIds, afterDate),
  ]);

  if (!conditionsAfter) return null;

  return {
    tierBefore: getTier(conditionsBefore),
    tierAfter: getTier(conditionsAfter),
    conditionsBefore,
    conditionsAfter,
  };
}

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
