import { roundRank, roundTypeLabel } from "@/lib/utils";
import {
  attemptToChartValue,
  calculateDeviation,
  isHigherBetter,
} from "@/lib/solve-chart";
import type { TeamResultsByEventGroup } from "./queries";

export type SessionPoint = {
  solveNumber: number;
  value: number | null;
  rawSolve: number;
  personName: string;
  competitionName: string;
  round: string;
  /** Set on solves that improved the team's best so far. */
  best: number | null;
  isStateRecord: boolean;
};

export type TeamSolveStats = {
  deviation: number | null;
  best: number | null;
  worst: number | null;
  mean: number | null;
  totalTime: number | null;
  count: number;
  validCount: number;
  stateRecordCount: number;
};

/** Every attempt of the team in chronological order, marking each new team best. */
export function buildTeamSolvePoints(
  group: TeamResultsByEventGroup,
): SessionPoint[] {
  const chronological = group.results.slice().sort((left, right) => {
    const dateDelta = left.competitionStartDate.localeCompare(
      right.competitionStartDate,
    );
    if (dateDelta !== 0) {
      return dateDelta;
    }

    const roundDelta =
      roundRank(right.roundTypeId) - roundRank(left.roundTypeId);
    if (roundDelta !== 0) {
      return roundDelta;
    }

    return (
      (left.position ?? 999) - (right.position ?? 999) ||
      left.best - right.best ||
      (left.personName ?? "").localeCompare(right.personName ?? "")
    );
  });

  const eventId = group.eventId;
  const points: SessionPoint[] = [];
  let runningBestRaw: number | null = null;

  for (const resultRow of chronological) {
    const isStateRecordResult =
      resultRow.isStateRecordSingle || resultRow.stateSingleRecord === "SR";

    for (const solve of resultRow.solves) {
      if (solve === -2) continue;

      const value = attemptToChartValue(resultRow.eventId, solve);
      let best: number | null = null;
      let isStateRecord = false;

      if (value !== null && solve > 0) {
        const isNewPb =
          runningBestRaw === null ||
          (eventId === "333mbf"
            ? solve < runningBestRaw
            : value < runningBestRaw);

        if (isNewPb) {
          runningBestRaw = eventId === "333mbf" ? solve : value;
          best = value;
          isStateRecord = isStateRecordResult && solve === resultRow.best;
        }
      }

      points.push({
        solveNumber: points.length + 1,
        value,
        rawSolve: solve,
        personName: resultRow.personName ?? resultRow.personId,
        competitionName: resultRow.competitionName,
        round: roundTypeLabel(resultRow.roundTypeId),
        best,
        isStateRecord,
      });
    }
  }

  return points;
}

export function teamSolveStats(
  eventId: string,
  points: SessionPoint[],
): TeamSolveStats | null {
  if (points.length === 0) return null;

  const higherBetter = isHigherBetter(eventId);
  const valid = points
    .map((p) => p.value)
    .filter((v): v is number => v !== null);
  const hasValid = valid.length > 0;
  const sum = valid.reduce((acc, v) => acc + v, 0);

  return {
    deviation: calculateDeviation(valid),
    best: hasValid
      ? higherBetter
        ? Math.max(...valid)
        : Math.min(...valid)
      : null,
    worst: hasValid
      ? higherBetter
        ? Math.min(...valid)
        : Math.max(...valid)
      : null,
    mean: hasValid ? sum / valid.length : null,
    totalTime: hasValid ? sum : null,
    count: points.length,
    validCount: valid.length,
    stateRecordCount: points.filter((p) => p.best !== null).length,
  };
}
