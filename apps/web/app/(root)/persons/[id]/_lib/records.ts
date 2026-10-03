import "server-only";

import { db } from "@workspace/db";
import {
  championship,
  competition,
  competitionRoundDate,
  result,
  resultAttempts,
  event,
} from "@workspace/db/schema";
import { and, asc, desc, eq, gt, inArray, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { recordDateSql, toDateKey } from "@/lib/record-date";

export type PersonRecordHistoryEntry = {
  resultId: string;
  eventId: string;
  eventName: string;
  eventRank: number;
  competitionId: string;
  competitionName: string;
  competitionStartDate: string;
  roundTypeId: string | null;
  position: number | null;
  best: number;
  average: number;
  regionalSingleRecord: string | null;
  regionalAverageRecord: string | null;
  stateSingleRecord: string | null;
  stateAverageRecord: string | null;
  solves: number[];
};

/** Mexican Nationals, North American Championship, and World Championship. */
const FEATURED_CHAMPIONSHIP_TYPES = ["MX", "_North America", "world"] as const;

/**
 * Re-rank finals among eligible competitors (WCA tie-preserving).
 * For MX nationals the DB only stores Mexican results, so this matches
 * nationality-based championship places when foreigners finished ahead.
 */
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

export type PersonChampionshipPodium = {
  resultId: string;
  eventId: string;
  eventName: string;
  eventRank: number;
  competitionId: string;
  competitionName: string;
  competitionStartDate: string;
  championshipType: string;
  roundTypeId: string | null;
  position: number | null;
  best: number;
  average: number;
  solves: number[];
};

export async function getPersonRecordHistory(
  wcaId: string,
): Promise<PersonRecordHistoryEntry[]> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-record-history-${wcaId}`);

  const rows = await db
    .select({
      resultId: result.id,
      eventId: result.eventId,
      eventName: event.name,
      eventRank: event.rank,
      competitionId: competition.id,
      competitionName: competition.name,
      competitionStartDate: recordDateSql,
      roundTypeId: result.roundTypeId,
      position: result.pos,
      best: result.best,
      average: result.average,
      regionalSingleRecord: result.regionalSingleRecord,
      regionalAverageRecord: result.regionalAverageRecord,
      stateSingleRecord: result.stateSingleRecord,
      stateAverageRecord: result.stateAverageRecord,
    })
    .from(result)
    .innerJoin(event, eq(result.eventId, event.id))
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .leftJoin(
      competitionRoundDate,
      and(
        eq(competitionRoundDate.competitionId, result.competitionId),
        eq(competitionRoundDate.eventId, result.eventId),
        eq(competitionRoundDate.roundTypeId, result.roundTypeId),
      ),
    )
    .where(
      and(
        eq(result.personId, wcaId),
        or(
          inArray(result.regionalSingleRecord, ["NR", "NAR", "WR"]),
          inArray(result.regionalAverageRecord, ["NR", "NAR", "WR"]),
          eq(result.stateSingleRecord, "SR"),
          eq(result.stateAverageRecord, "SR"),
        ),
      ),
    )
    .orderBy(event.rank, desc(recordDateSql));

  if (rows.length === 0) return [];

  const attempts = await db
    .select({
      resultId: resultAttempts.resultId,
      attemptNumber: resultAttempts.attemptNumber,
      value: resultAttempts.value,
    })
    .from(resultAttempts)
    .where(
      inArray(
        resultAttempts.resultId,
        rows.map((r) => r.resultId),
      ),
    )
    .orderBy(resultAttempts.resultId, resultAttempts.attemptNumber);

  const attemptsByResultId = attempts.reduce((acc, attempt) => {
    const values = acc.get(attempt.resultId) ?? [];
    values.push(attempt.value);
    acc.set(attempt.resultId, values);
    return acc;
  }, new Map<string, number[]>());

  return rows.map((row) => ({
    ...row,
    competitionStartDate: toDateKey(row.competitionStartDate),
    solves: attemptsByResultId.get(row.resultId) ?? [],
  }));
}

export async function getPersonChampionshipPodiums(
  wcaId: string,
): Promise<PersonChampionshipPodium[]> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-championship-podiums-${wcaId}`);

  const rows = await db
    .select({
      resultId: result.id,
      eventId: result.eventId,
      eventName: event.name,
      eventRank: event.rank,
      competitionId: competition.id,
      competitionName: competition.name,
      competitionStartDate: competition.startDate,
      championshipType: championship.championshipType,
      roundTypeId: result.roundTypeId,
      position: result.pos,
      best: result.best,
      average: result.average,
    })
    .from(result)
    .innerJoin(event, eq(result.eventId, event.id))
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(championship, eq(championship.competitionId, competition.id))
    .where(
      and(
        eq(result.personId, wcaId),
        inArray(result.roundTypeId, ["f", "c"]),
        gt(result.best, 0),
        inArray(championship.championshipType, [
          ...FEATURED_CHAMPIONSHIP_TYPES,
        ]),
      ),
    )
    .orderBy(desc(competition.startDate), event.rank);

  if (rows.length === 0) return [];

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

    const peersByFinal = peers.reduce((acc, peer) => {
      const key = `${peer.competitionId}:${peer.eventId}:${peer.roundTypeId ?? ""}`;
      const list = acc.get(key) ?? [];
      list.push(peer);
      acc.set(key, list);
      return acc;
    }, new Map<string, typeof peers>());

    for (const group of peersByFinal.values()) {
      for (const ranked of assignChampionshipPositions(group)) {
        if (ranked.championshipPosition <= 3) {
          mxChampionshipPosByResultId.set(
            ranked.resultId,
            ranked.championshipPosition,
          );
        }
      }
    }
  }

  const podiumRows = rows.flatMap((row) => {
    if (row.championshipType === "MX") {
      const championshipPosition = mxChampionshipPosByResultId.get(
        row.resultId,
      );
      if (championshipPosition === undefined) return [];
      return [{ ...row, position: championshipPosition }];
    }

    if (row.position != null && row.position >= 1 && row.position <= 3) {
      return [row];
    }

    return [];
  });

  if (podiumRows.length === 0) return [];

  const attempts = await db
    .select({
      resultId: resultAttempts.resultId,
      attemptNumber: resultAttempts.attemptNumber,
      value: resultAttempts.value,
    })
    .from(resultAttempts)
    .where(
      inArray(
        resultAttempts.resultId,
        podiumRows.map((r) => r.resultId),
      ),
    )
    .orderBy(resultAttempts.resultId, resultAttempts.attemptNumber);

  const attemptsByResultId = attempts.reduce((acc, attempt) => {
    const values = acc.get(attempt.resultId) ?? [];
    values.push(attempt.value);
    acc.set(attempt.resultId, values);
    return acc;
  }, new Map<string, number[]>());

  return podiumRows.map((row) => ({
    ...row,
    competitionStartDate: row.competitionStartDate.toISOString(),
    solves: attemptsByResultId.get(row.resultId) ?? [],
  }));
}

export async function hasPersonChampionshipPodiums(
  wcaId: string,
): Promise<boolean> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-championship-podiums-${wcaId}`);

  const rows = await db
    .select({
      resultId: result.id,
      competitionId: result.competitionId,
      eventId: result.eventId,
      roundTypeId: result.roundTypeId,
      championshipType: championship.championshipType,
      position: result.pos,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(championship, eq(championship.competitionId, competition.id))
    .where(
      and(
        eq(result.personId, wcaId),
        inArray(result.roundTypeId, ["f", "c"]),
        gt(result.best, 0),
        inArray(championship.championshipType, [
          ...FEATURED_CHAMPIONSHIP_TYPES,
        ]),
      ),
    );

  if (rows.length === 0) return false;

  const hasAbsolutePodium = rows.some(
    (row) =>
      row.championshipType !== "MX" &&
      row.position != null &&
      row.position >= 1 &&
      row.position <= 3,
  );
  if (hasAbsolutePodium) return true;

  const mxCompetitionIds = [
    ...new Set(
      rows
        .filter((row) => row.championshipType === "MX")
        .map((row) => row.competitionId),
    ),
  ];
  if (mxCompetitionIds.length === 0) return false;

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

  const personResultIds = new Set(
    rows
      .filter((row) => row.championshipType === "MX")
      .map((row) => row.resultId),
  );

  const peersByFinal = peers.reduce((acc, peer) => {
    const key = `${peer.competitionId}:${peer.eventId}:${peer.roundTypeId ?? ""}`;
    const list = acc.get(key) ?? [];
    list.push(peer);
    acc.set(key, list);
    return acc;
  }, new Map<string, typeof peers>());

  for (const group of peersByFinal.values()) {
    for (const ranked of assignChampionshipPositions(group)) {
      if (
        ranked.championshipPosition <= 3 &&
        personResultIds.has(ranked.resultId)
      ) {
        return true;
      }
    }
  }

  return false;
}

export type PersonPodiumsByEvent = {
  eventId: string;
  eventName: string;
  eventRank: number;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
};

export async function getPersonPodiumsByEvent(
  wcaId: string,
): Promise<PersonPodiumsByEvent[]> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-podiums-by-event-${wcaId}`);

  const rows = await db
    .select({
      eventId: event.id,
      eventName: event.name,
      eventRank: event.rank,
      gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1 AND ${result.roundTypeId} IN('f','c') AND ${result.best} > 0)`,
      silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2 AND ${result.roundTypeId} IN('f','c') AND ${result.best} > 0)`,
      bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3 AND ${result.roundTypeId} IN('f','c') AND ${result.best} > 0)`,
    })
    .from(result)
    .innerJoin(event, eq(result.eventId, event.id))
    .where(eq(result.personId, wcaId))
    .groupBy(event.id, event.name, event.rank);

  return rows
    .map((row) => {
      const gold = Number(row.gold ?? 0);
      const silver = Number(row.silver ?? 0);
      const bronze = Number(row.bronze ?? 0);
      return {
        eventId: row.eventId,
        eventName: row.eventName,
        eventRank: Number(row.eventRank ?? 0),
        gold,
        silver,
        bronze,
        total: gold + silver + bronze,
      };
    })
    .sort(
      (a, b) =>
        b.gold - a.gold ||
        b.silver - a.silver ||
        b.bronze - a.bronze ||
        a.eventRank - b.eventRank,
    );
}

export type PersonPrStreakCompetition = {
  competitionId: string;
  competitionName: string;
  startDate: string;
  endDate: string;
};

export type PersonPrStreaks = {
  currentStreak: PersonPrStreakCompetition[];
  longestStreak: PersonPrStreakCompetition[];
};

function isPersonalRecord(
  eventId: string,
  value: number,
  records: Record<string, number>,
): boolean {
  if (value === 0 || value === -1) {
    return false;
  }
  if (records[eventId] === undefined) {
    return true;
  }
  return value <= records[eventId]!;
}

export async function getPersonPrStreaks(
  wcaId: string,
): Promise<PersonPrStreaks> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-pr-streaks-${wcaId}`);

  const rows = await db
    .select({
      competitionId: result.competitionId,
      eventId: result.eventId,
      best: result.best,
      average: result.average,
      competitionName: competition.name,
      startDate: competition.startDate,
      endDate: competition.endDate,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(eq(result.personId, wcaId))
    .orderBy(asc(competition.startDate), asc(result.competitionId));

  if (rows.length === 0) {
    return { currentStreak: [], longestStreak: [] };
  }

  type CompMeta = {
    competitionId: string;
    competitionName: string;
    startDate: Date;
    endDate: Date;
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
        endDate: row.endDate,
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
  let currentStreak: PersonPrStreakCompetition[] = [];
  let longestStreak: PersonPrStreakCompetition[] = [];

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

    const streakComp: PersonPrStreakCompetition = {
      competitionId: comp.competitionId,
      competitionName: comp.competitionName,
      startDate: comp.startDate.toISOString(),
      endDate: comp.endDate.toISOString(),
    };

    if (recordAttained) {
      currentStreak = [...currentStreak, streakComp];
      if (currentStreak.length > longestStreak.length) {
        longestStreak = currentStreak;
      }
    } else {
      currentStreak = [];
    }
  }

  return { currentStreak, longestStreak };
}
