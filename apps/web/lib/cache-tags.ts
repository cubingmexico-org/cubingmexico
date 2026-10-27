import { updateTag } from "next/cache";
import {
  currentUserTeamTag,
  personStateRecordTags,
  stateMemberTags,
  tagsAfterStateRanksChange,
} from "@/lib/cache-tag-names";

export {
  COARSE_RANK_TAGS,
  personStateRecordTags,
  stateMemberTags,
  tagsAfterStateRanksChange,
} from "@/lib/cache-tag-names";

export function invalidateCurrentUserTeam(personIds: string[]) {
  for (const wcaId of personIds) {
    updateTag(currentUserTeamTag(wcaId));
  }
}

export function invalidateAfterStateRanksChange(stateId: string) {
  for (const tag of tagsAfterStateRanksChange(stateId)) {
    updateTag(tag);
  }
}

export function invalidateStateMemberTags(stateId: string) {
  for (const tag of stateMemberTags(stateId)) {
    updateTag(tag);
  }
}

export function invalidateAfterStateRecordsChange(personIds: string[]) {
  for (const tag of personStateRecordTags(personIds)) {
    updateTag(tag);
  }
}
