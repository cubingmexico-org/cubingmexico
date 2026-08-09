import { updateTag } from "next/cache";
import {
  stateMemberTags,
  tagsAfterStateRanksChange,
} from "@/lib/cache-tag-names";

export {
  COARSE_RANK_TAGS,
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
