import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import type { GroupKind } from "@workspace/db/schema";
import {
  canManageGroup,
  getGroupRole,
  getSessionUserId,
} from "@/lib/group-auth";
import { formatGroupLocationLine } from "@/lib/groups";
import { getGroupShellData } from "../_lib/queries";
import { GroupShell } from "./group-shell";

export async function GroupFrame({
  params,
  expectedKind,
  children,
}: {
  params: Promise<{ groupId: string }>;
  expectedKind: GroupKind;
  children: ReactNode;
}) {
  const { groupId } = await params;
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

  const hasRoster = data.group.kind !== "sponsor" || data.totalMembers > 0;
  const locationLabel = formatGroupLocationLine({
    kind: data.group.kind,
    regionLabel: data.group.regionLabel,
    city: data.group.city,
    stateName: data.group.stateName,
  });

  return (
    <GroupShell
      groupId={groupId}
      kind={data.group.kind}
      name={data.group.name}
      image={data.group.image}
      coverImage={data.group.coverImage}
      isActive={data.group.isActive}
      locationLabel={locationLabel}
      websiteUrl={data.group.websiteUrl}
      totalMembers={data.totalMembers}
      hasRoster={hasRoster}
      founded={data.group.founded}
      canManage={canManageGroup(role)}
    >
      {children}
    </GroupShell>
  );
}
