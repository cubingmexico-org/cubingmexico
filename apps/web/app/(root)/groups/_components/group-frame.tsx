import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import type { GroupKind } from "@workspace/db/schema";
import {
  canManageGroup,
  getGroupRole,
  getSessionUserId,
} from "@/lib/group-auth";
import { getGroupShellData } from "../_lib/queries";
import { GroupShell } from "./group-shell";

export async function GroupFrame({
  groupId,
  expectedKind,
  children,
}: {
  groupId: string;
  expectedKind: GroupKind;
  children: ReactNode;
}) {
  const data = await getGroupShellData(groupId);
  if (!data || data.group.kind !== expectedKind) {
    notFound();
  }

  // Inactive sponsors stay out of the public directory; managers/superadmins
  // still reach manage via direct URL after auth checks there.
  if (
    expectedKind === "sponsor" &&
    data.group.sponsorshipStatus !== "active" &&
    data.group.isActive
  ) {
    const userId = await getSessionUserId();
    const role = userId ? await getGroupRole(groupId, userId) : null;
    if (!canManageGroup(role)) {
      notFound();
    }
  }

  const userId = await getSessionUserId();
  const role = userId ? await getGroupRole(groupId, userId) : null;

  return (
    <GroupShell
      groupId={groupId}
      kind={data.group.kind}
      name={data.group.name}
      image={data.group.image}
      coverImage={data.group.coverImage}
      isActive={data.group.isActive}
      regionLabel={data.group.regionLabel}
      websiteUrl={data.group.websiteUrl}
      totalMembers={data.totalMembers}
      founded={data.group.founded}
      canManage={canManageGroup(role)}
    >
      {children}
    </GroupShell>
  );
}
