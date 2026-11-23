import type { Metadata } from "next";
import { getGroupInfo } from "../../groups/_lib/queries";
import { GroupOverview } from "../../groups/_components/group-overview";

type Props = { params: Promise<{ groupId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params;
  const group = await getGroupInfo(groupId);
  return {
    title: `${group?.name ?? "Comunidad"} | Cubing México`,
    description: group?.description ?? "Comunidad de speedcubing en México.",
  };
}

export default async function Page({ params }: Props) {
  const { groupId } = await params;
  return <GroupOverview groupId={groupId} kind="community" />;
}
