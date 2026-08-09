import { updateTag } from "next/cache";
import {
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
