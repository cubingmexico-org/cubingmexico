import type { Metadata } from "next";
import { notFound, unauthorized } from "next/navigation";
import {
  canManageGroup,
  getGroupRole,
  getSessionUserId,
  groupRoleHasPermission,
} from "@/lib/group-auth";
import { isSuperadmin } from "@/lib/superadmin";
import { ManageGroup } from "../../../groups/_components/manage-group";
import { getGroupInfo, getGroupMembers } from "../../../groups/_lib/queries";

type Props = { params: Promise<{ groupId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params;
  const group = await getGroupInfo(groupId);
  return {
    title: `${group?.name ?? "Comunidad"} | Administrar | Cubing México`,
  };
}

export default async function Page({ params }: Props) {
  const userId = await getSessionUserId();
  if (!userId) unauthorized();

  const { groupId } = await params;
  const role = await getGroupRole(groupId, userId);
  if (!canManageGroup(role)) unauthorized();

  const [group, members] = await Promise.all([
    getGroupInfo(groupId),
    getGroupMembers(groupId),
  ]);
  if (!group || group.kind !== "community") notFound();

  return (
    <ManageGroup
      group={group}
      members={members.map((m) => ({
        wcaId: m.wcaId,
        name: m.name,
        state: m.state,
        role: m.role,
      }))}
      canManageRoles={groupRoleHasPermission(role, "group.roles")}
      isSuperadmin={isSuperadmin(userId)}
    />
  );
}
