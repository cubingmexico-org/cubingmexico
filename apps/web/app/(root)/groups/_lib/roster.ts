import "server-only";

import { redirect } from "next/navigation";
import type { GroupKind } from "@workspace/db/schema";
import { groupHref } from "@/lib/groups";
import { getGroupTotalMembers } from "./queries";

/** Communities always expose competitive pages; sponsors only when they have members. */
export function groupHasRoster(kind: GroupKind, totalMembers: number): boolean {
  return kind !== "sponsor" || totalMembers > 0;
}

/** Send roster-less sponsors away from competitive deep links. */
export async function redirectIfSponsorHasNoRoster(
  groupId: string,
  kind: GroupKind,
) {
  if (kind !== "sponsor") return;
  const totalMembers = await getGroupTotalMembers(groupId);
  if (totalMembers === 0) {
    redirect(groupHref("sponsor", groupId));
  }
}
