import "server-only";

import { updateTag } from "next/cache";
import {
  invalidateAfterGroupRanksChange,
  invalidateAfterGroupRecordsChange,
  invalidateGroupMemberTags,
} from "@/lib/cache-tags";
import { reportError } from "@/lib/report-error";
import {
  clearPersonGroupRanks,
  clearPersonGroupRecords,
  updateGroupRanks,
  updateGroupRecords,
} from "@/lib/group-updates";

export const GROUP_ROSTER_REFRESH_PENDING =
  "Guardado. Los rankings del grupo se actualizarán más tarde.";

/**
 * Recomputes group ranks/records and invalidates caches after membership changes.
 */
export async function refreshGroupsAfterRosterChange({
  groupIds,
  personIds,
}: {
  groupIds: string[];
  personIds: string[];
}): Promise<{ ok: boolean }> {
  const groups = [...new Set(groupIds.filter(Boolean))];
  await clearPersonGroupRanks(personIds, groups);
  await clearPersonGroupRecords(personIds, groups);

  let ok = true;
  const recordPersonIds = new Set(personIds);

  for (const groupId of groups) {
    try {
      await updateGroupRanks(groupId);
      const records = await updateGroupRecords(groupId);
      for (const personId of records.personIds) {
        recordPersonIds.add(personId);
      }
    } catch (error) {
      ok = false;
      reportError(error, { groupId });
    }
    invalidateAfterGroupRanksChange(groupId);
    invalidateGroupMemberTags(groupId);
  }

  invalidateAfterGroupRecordsChange([...recordPersonIds]);
  for (const personId of personIds) {
    updateTag(`profile-person-${personId}`);
    updateTag(`person-data-wca-${personId}`);
    updateTag(`person-groups-${personId}`);
  }

  return { ok };
}
