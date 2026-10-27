import "server-only";

import { db } from "@workspace/db";
import { championship, competition, result, event } from "@workspace/db/schema";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getAttemptsByResultId } from "./result-attempts";

/** Mexican Nationals, North American Championship, and World Championship. */
const FEATURED_CHAMPIONSHIP_TYPES = ["MX", "_North America", "world"] as const;

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

/** Championship places 1-3 at the given MX nationals, keyed by result id. */
async function getMxChampionshipPodiumPositions(
  mxCompetitionIds: string[],
): Promise<Map<string, number>> {
  const positions = new Map<string, number>();
  if (mxCompetitionIds.length === 0) return positions;

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
        positions.set(ranked.resultId, ranked.championshipPosition);
      }
    }
  }

  return positions;
}

function mxCompetitionIdsOf(
  rows: { championshipType: string; competitionId: string }[],
): string[] {
  return [
    ...new Set(
      rows
        .filter((row) => row.championshipType === "MX")
        .map((row) => row.competitionId),
    ),
  ];
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

  const mxChampionshipPosByResultId = await getMxChampionshipPodiumPositions(
    mxCompetitionIdsOf(rows),
  );

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

  const attemptsByResultId = await getAttemptsByResultId(
    podiumRows.map((r) => r.resultId),
  );

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

  const mxPositions = await getMxChampionshipPodiumPositions(
    mxCompetitionIdsOf(rows),
  );
  return rows.some(
    (row) => row.championshipType === "MX" && mxPositions.has(row.resultId),
  );
}
