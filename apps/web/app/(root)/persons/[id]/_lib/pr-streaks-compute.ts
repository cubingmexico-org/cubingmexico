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

export type PrStreakResultRow = {
  competitionId: string;
  competitionName: string;
  startDate: Date;
  endDate: Date;
  eventId: string;
  best: number;
  average: number;
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

/**
 * Current and longest runs of consecutive competitions with at least one PR
 * (single or average, ties count). `rows` must be in competition date order,
 * with each competition's results adjacent.
 */
export function computePrStreaks(rows: PrStreakResultRow[]): PersonPrStreaks {
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
