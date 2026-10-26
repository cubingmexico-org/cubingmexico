import "server-only";

import { db } from "@workspace/db";
import { rankAverage, rankSingle, result } from "@workspace/db/schema";
import { inArray } from "drizzle-orm";
import { backendErrorMessage, postToBackend } from "@/lib/backend";

/**
 * State ranks and state records are computed by the Flask backend
 * (`routes/admin/state.py`), for every state after a WCA import and for one
 * state through these calls after a roster change.
 */

export type StateRecordsUpdate = {
  personIds: string[];
  singleCount: number;
  averageCount: number;
};

async function postStateJob(path: string, stateId: string) {
  const response = await postToBackend(
    `${path}/${encodeURIComponent(stateId)}`,
  );
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "Invalid stateId"
        : backendErrorMessage(response),
    );
  }
  return response.body;
}

/** Recompute state ranks for the current members of `stateId`. */
export async function updateStateRanks(stateId: string): Promise<void> {
  await postStateJob("/update-state-ranks", stateId);
}

/**
 * Recompute historical state record markers for the current members of
 * `stateId`. Returns those members so the caller can invalidate their pages.
 */
export async function updateStateRecords(
  stateId: string,
): Promise<StateRecordsUpdate> {
  const body = (await postStateJob(
    "/update-state-records",
    stateId,
  )) as Partial<StateRecordsUpdate> | null;
  return {
    personIds: body?.personIds ?? [],
    singleCount: body?.singleCount ?? 0,
    averageCount: body?.averageCount ?? 0,
  };
}

/** Clear stateRank for people leaving a state (or changing states). */
export async function clearPersonStateRanks(personIds: string[]) {
  if (personIds.length === 0) {
    return;
  }

  await db
    .update(rankSingle)
    .set({ stateRank: null })
    .where(inArray(rankSingle.personId, personIds));

  await db
    .update(rankAverage)
    .set({ stateRank: null })
    .where(inArray(rankAverage.personId, personIds));
}

/** Clear historical SR tags for people leaving a state (or changing states). */
export async function clearPersonStateRecords(personIds: string[]) {
  if (personIds.length === 0) {
    return;
  }

  await db
    .update(result)
    .set({
      stateSingleRecord: null,
      stateAverageRecord: null,
    })
    .where(inArray(result.personId, personIds));
}
