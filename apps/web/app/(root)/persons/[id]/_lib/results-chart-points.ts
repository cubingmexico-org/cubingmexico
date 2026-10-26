import { roundRank, roundTypeLabel } from "@/lib/utils";
import {
  attemptToChartValue,
  calculateAoN,
  calculateDeviation,
  isHigherBetter,
} from "@/lib/solve-chart";
import type { PersonResultsByEventGroup } from "./queries";

export type SessionPoint = {
  solveNumber: number;
  value: number | null;
  rawSolve: number;
  competitionName: string;
  round: string;
  best: number | null;
  ao12: number | null;
  ao50: number | null;
  ao100: number | null;
  bestAo50: number | null;
  bestAo100: number | null;
};

export type SessionStats = {
  global: {
    deviation: number | null;
    ao12: number | null;
    ao50: number | null;
    ao100: number | null;
    best: number | null;
    worst: number | null;
    mean: number | null;
    totalTime: number | null;
    count: number;
    validCount: number;
  };
  last: {
    ao12: number | null;
    ao50: number | null;
    ao100: number | null;
  };
};

/**
 * Every attempt of one event as a single chronological "session" (oldest
 * competition first), with running PBs, Ao12/Ao50/Ao100, and the points where
 * the best Ao50 and Ao100 were reached.
 */
export function buildSessionPoints(
  selectedResults: PersonResultsByEventGroup | null,
): SessionPoint[] {
  if (!selectedResults) {
    return [];
  }

  const chronological = selectedResults.results.slice().sort((left, right) => {
    const dateDelta = left.competitionStartDate.localeCompare(
      right.competitionStartDate,
    );

    if (dateDelta !== 0) {
      return dateDelta;
    }

    return roundRank(right.roundTypeId) - roundRank(left.roundTypeId);
  });

  const rawSolvesList: {
    value: number | null;
    rawSolve: number;
    competitionName: string;
    round: string;
  }[] = [];

  for (const resultRow of chronological) {
    for (const solve of resultRow.solves) {
      // Skip DNS (-2) entirely — only DNF (-1) is kept as null for AoN purposes
      if (solve === -2) continue;

      rawSolvesList.push({
        value: attemptToChartValue(resultRow.eventId, solve),
        rawSolve: solve,
        competitionName: resultRow.competitionName,
        round: roundTypeLabel(resultRow.roundTypeId),
      });
    }
  }

  const eventId = selectedResults.eventId;
  const higherBetter = isHigherBetter(eventId);
  const allValues = rawSolvesList.map((s) => s.value);
  // WCA ordering: lower encoded multi value is better; for other events use chart value.
  let runningBestRaw: number | null = null;
  const resultPoints: SessionPoint[] = [];

  for (let i = 0; i < rawSolvesList.length; i++) {
    const item = rawSolvesList[i];
    if (!item) continue;

    let bestVal: number | null = null;

    if (item.value !== null && item.rawSolve > 0) {
      const isNewPb =
        runningBestRaw === null ||
        (eventId === "333mbf"
          ? item.rawSolve < runningBestRaw
          : higherBetter
            ? item.value > runningBestRaw
            : item.value < runningBestRaw);

      if (isNewPb) {
        runningBestRaw = eventId === "333mbf" ? item.rawSolve : item.value;
        bestVal = item.value;
      }
    }

    const window12 = allValues.slice(Math.max(0, i - 11), i + 1);
    const ao12Val = calculateAoN(window12, 12);

    const window50 = allValues.slice(Math.max(0, i - 49), i + 1);
    const ao50Val = calculateAoN(window50, 50);

    const window100 = allValues.slice(Math.max(0, i - 99), i + 1);
    const ao100Val = calculateAoN(window100, 100);

    resultPoints.push({
      solveNumber: i + 1,
      value: item.value,
      rawSolve: item.rawSolve,
      competitionName: item.competitionName,
      round: item.round,
      best: bestVal,
      ao12: ao12Val,
      ao50: ao50Val,
      ao100: ao100Val,
      bestAo50: null,
      bestAo100: null,
    });
  }

  let bestAo50: number | null = null;
  let bestAo50Idx = -1;
  let bestAo100: number | null = null;
  let bestAo100Idx = -1;

  for (let i = 0; i < resultPoints.length; i++) {
    const pt = resultPoints[i];
    if (!pt) continue;
    if (
      pt.ao50 !== null &&
      (bestAo50 === null ||
        (higherBetter ? pt.ao50 > bestAo50 : pt.ao50 < bestAo50))
    ) {
      bestAo50 = pt.ao50;
      bestAo50Idx = i;
    }
    if (
      pt.ao100 !== null &&
      (bestAo100 === null ||
        (higherBetter ? pt.ao100 > bestAo100 : pt.ao100 < bestAo100))
    ) {
      bestAo100 = pt.ao100;
      bestAo100Idx = i;
    }
  }

  if (bestAo50Idx !== -1) {
    const targetAo50 = resultPoints[bestAo50Idx];
    if (targetAo50) {
      targetAo50.bestAo50 = bestAo50;
    }
  }
  if (bestAo100Idx !== -1) {
    const targetAo100 = resultPoints[bestAo100Idx];
    if (targetAo100) {
      targetAo100.bestAo100 = bestAo100;
    }
  }

  return resultPoints;
}

/** Best averages, extremes and totals over the whole session, plus the current moving averages. */
export function summarizeSessionPoints(
  eventId: string,
  points: SessionPoint[],
): SessionStats | null {
  if (points.length === 0) return null;

  const higherBetter = isHigherBetter(eventId);
  const allSolves = points.map((p) => p.value);
  const validAllSolves = allSolves.filter((v): v is number => v !== null);

  const globalDev = calculateDeviation(validAllSolves);

  const pickBestAo = (values: number[]) =>
    values.length > 0
      ? higherBetter
        ? Math.max(...values)
        : Math.min(...values)
      : null;

  // Global best averages achieved across entire timeline
  const validAo12s = points
    .map((p) => p.ao12)
    .filter((v): v is number => v !== null);
  const globalAo12 = pickBestAo(validAo12s) ?? calculateAoN(allSolves, 12);

  const validAo50s = points
    .map((p) => p.ao50)
    .filter((v): v is number => v !== null);
  const globalAo50 = pickBestAo(validAo50s) ?? calculateAoN(allSolves, 50);

  const validAo100s = points
    .map((p) => p.ao100)
    .filter((v): v is number => v !== null);
  const globalAo100 = pickBestAo(validAo100s) ?? calculateAoN(allSolves, 100);

  const globalBest =
    validAllSolves.length > 0
      ? higherBetter
        ? Math.max(...validAllSolves)
        : Math.min(...validAllSolves)
      : null;
  const globalWorst =
    validAllSolves.length > 0
      ? higherBetter
        ? Math.min(...validAllSolves)
        : Math.max(...validAllSolves)
      : null;
  const globalMean =
    validAllSolves.length > 0
      ? validAllSolves.reduce((acc, v) => acc + v, 0) / validAllSolves.length
      : null;
  const globalTotalTime =
    validAllSolves.length > 0
      ? validAllSolves.reduce((acc, v) => acc + v, 0)
      : null;

  // Last results (current moving averages at the end of the solve history)
  const lastAo12 = calculateAoN(allSolves, 12);
  const lastAo50 = calculateAoN(allSolves, 50);
  const lastAo100 = calculateAoN(allSolves, 100);

  return {
    global: {
      deviation: globalDev,
      ao12: globalAo12,
      ao50: globalAo50,
      ao100: globalAo100,
      best: globalBest,
      worst: globalWorst,
      mean: globalMean,
      totalTime: globalTotalTime,
      count: allSolves.length,
      validCount: validAllSolves.length,
    },
    last: {
      ao12: lastAo12,
      ao50: lastAo50,
      ao100: lastAo100,
    },
  };
}
