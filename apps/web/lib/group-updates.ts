import "server-only";

import { db } from "@workspace/db";
import {
  groupRankAverage,
  groupRankSingle,
  groupRecordMarker,
  result,
} from "@workspace/db/schema";
import { and, inArray } from "drizzle-orm";
import { backendErrorMessage, postToBackend } from "@/lib/backend";

export type GroupRecordsUpdate = {
  personIds: string[];
  singleCount: number;
  averageCount: number;
};

async function postGroupJob(path: string, groupId: string) {
  const response = await postToBackend(
    `${path}/${encodeURIComponent(groupId)}`,
  );
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "Invalid groupId"
        : backendErrorMessage(response),
    );
  }
  return response.body;
}

/** Recompute group ranks for the current members of `groupId`. */
export async function updateGroupRanks(groupId: string): Promise<void> {
  await postGroupJob("/update-group-ranks", groupId);
}

/**
 * Recompute historical group record markers for the current members of
 * `groupId`. Returns those members so the caller can invalidate their pages.
 */
export async function updateGroupRecords(
  groupId: string,
): Promise<GroupRecordsUpdate> {
  const body = (await postGroupJob(
    "/update-group-records",
    groupId,
  )) as Partial<GroupRecordsUpdate> | null;
  return {
    personIds: body?.personIds ?? [],
    singleCount: body?.singleCount ?? 0,
    averageCount: body?.averageCount ?? 0,
  };
}

/** Clear stored group ranks for people (optionally limited to `groupIds`). */
export async function clearPersonGroupRanks(
  personIds: string[],
  groupIds?: string[],
) {
  if (personIds.length === 0) {
    return;
  }

  const singleWhere =
    groupIds && groupIds.length > 0
      ? and(
          inArray(groupRankSingle.personId, personIds),
          inArray(groupRankSingle.groupId, groupIds),
        )
      : inArray(groupRankSingle.personId, personIds);

  const averageWhere =
    groupIds && groupIds.length > 0
      ? and(
          inArray(groupRankAverage.personId, personIds),
          inArray(groupRankAverage.groupId, groupIds),
        )
      : inArray(groupRankAverage.personId, personIds);

  await db.delete(groupRankSingle).where(singleWhere);
  await db.delete(groupRankAverage).where(averageWhere);
}

/** Clear group record markers for results owned by these people. */
export async function clearPersonGroupRecords(
  personIds: string[],
  groupIds?: string[],
) {
  if (personIds.length === 0) {
    return;
  }

  const personResults = await db
    .select({ id: result.id })
    .from(result)
    .where(inArray(result.personId, personIds));

  const resultIds = personResults.map((row) => row.id);
  if (resultIds.length === 0) {
    return;
  }

  const where =
    groupIds && groupIds.length > 0
      ? and(
          inArray(groupRecordMarker.resultId, resultIds),
          inArray(groupRecordMarker.groupId, groupIds),
        )
      : inArray(groupRecordMarker.resultId, resultIds);

  await db.delete(groupRecordMarker).where(where);
}
