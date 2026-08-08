import { ManageTeam } from "./_components/manage-team";
import { getValidFilters } from "@/lib/data-table";
import { SearchParams } from "@/types";
import { searchParamsCache } from "../_lib/validations";
import {
  getMembers,
  getMembersGenderCounts,
  getTeamInfo,
} from "../_lib/queries";
import { getTeam } from "@/db/queries";
import { Metadata } from "next";
import { notFound, unauthorized } from "next/navigation";
import {
  canManageTeam,
  getSessionUserId,
  getTeamRole,
  roleHasPermission,
} from "@/lib/team-auth";

type Props = {
  params: Promise<{ stateId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stateId = (await params).stateId;

  const team = await getTeam(stateId);

  return {
    title: `${team?.name} | Cubing México`,
    description: `${team?.name} es un equipo de ${team?.state} que compite en competencias de la World Cube Association.`,
  };
}

export default async function Page(props: {
  params: Promise<{ stateId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const userId = await getSessionUserId();

  if (!userId) {
    unauthorized();
  }

  const stateId = (await props.params).stateId;
  const role = await getTeamRole(stateId, userId);

  if (!canManageTeam(role)) {
    unauthorized();
  }

  const team = await getTeamInfo(stateId);

  if (!team) {
    notFound();
  }

  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);

  const validFilters = getValidFilters(search.filters);

  const promises = Promise.all([
    getMembers(
      {
        ...search,
        filters: validFilters,
      },
      stateId,
    ),
    getMembersGenderCounts(stateId),
  ]);

  return (
    <ManageTeam
      stateId={stateId}
      teamData={team}
      promises={promises}
      canManageRoles={roleHasPermission(role, "team.roles")}
    />
  );
}
