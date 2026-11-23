import { updateTag } from "next/cache";
import {
  currentUserTeamTag,
  groupMemberTags,
  personStateRecordTags,
  stateMemberTags,
  tagsAfterGroupRanksChange,
  tagsAfterStateRanksChange,
} from "@/lib/cache-tag-names";

export {
  COARSE_RANK_TAGS,
  groupMemberTags,
  personStateRecordTags,
  stateMemberTags,
  tagsAfterGroupRanksChange,
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

export function invalidateAfterGroupRanksChange(groupId: string) {
  for (const tag of tagsAfterGroupRanksChange(groupId)) {
    updateTag(tag);
  }
}

export function invalidateGroupMemberTags(groupId: string) {
  for (const tag of groupMemberTags(groupId)) {
    updateTag(tag);
  }
}

export function invalidateAfterGroupRecordsChange(personIds: string[]) {
  for (const tag of personStateRecordTags(personIds)) {
    updateTag(tag);
  }
}
