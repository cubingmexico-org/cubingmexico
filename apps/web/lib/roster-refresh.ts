import "server-only";

import { updateTag } from "next/cache";
import {
  invalidateAfterStateRanksChange,
  invalidateAfterStateRecordsChange,
  invalidateCurrentUserTeam,
  invalidateStateMemberTags,
} from "@/lib/cache-tags";
import { reportError } from "@/lib/report-error";
import {
  clearPersonStateRanks,
  clearPersonStateRecords,
  updateStateRanks,
  updateStateRecords,
} from "@/lib/state-updates";

/** Shown when a roster change saved but the backend couldn't recompute state ranks. */
export const ROSTER_REFRESH_PENDING =
  "Guardado. Los rankings estatales se actualizarán más tarde.";

/**
 * Brings state ranks, state records and cached pages up to date after `personIds`
 * joined or left the states in `stateIds`. Call it once the person rows are saved.
 *
 * Returns `ok: false` when the backend couldn't recompute a state. The roster change
 * stays saved and the nightly `update-all` run recomputes every state.
 */
export async function refreshStatesAfterRosterChange({
  stateIds,
  personIds,
}: {
  stateIds: (string | null)[];
  personIds: string[];
}): Promise<{ ok: boolean }> {
  await clearPersonStateRanks(personIds);
  await clearPersonStateRecords(personIds);

  let ok = true;
  const recordPersonIds = new Set(personIds);
  const states = new Set(
    stateIds.filter((stateId): stateId is string => Boolean(stateId)),
  );

  for (const stateId of states) {
    try {
      await updateStateRanks(stateId);
      const records = await updateStateRecords(stateId);
      for (const personId of records.personIds) {
        recordPersonIds.add(personId);
      }
    } catch (error) {
      ok = false;
      reportError(error, { stateId });
    }
    invalidateAfterStateRanksChange(stateId);
    invalidateStateMemberTags(stateId);
  }

  invalidateAfterStateRecordsChange([...recordPersonIds]);
  invalidateCurrentUserTeam(personIds);
  for (const personId of personIds) {
    updateTag(`profile-person-${personId}`);
    updateTag(`person-data-wca-${personId}`);
  }
  updateTag("persons-without-state");

  return { ok };
}
