import type { Metadata } from "next";
import { getGroupInfo } from "../../../groups/_lib/queries";
import { GroupMembers } from "../../../groups/_components/group-members";

type Props = { params: Promise<{ groupId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params;
  const group = await getGroupInfo(groupId);
  return {
    title: `${group?.name ?? "Patrocinador"} | Miembros | Cubing México`,
  };
}

export default async function Page({ params }: Props) {
  const { groupId } = await params;
  return <GroupMembers groupId={groupId} />;
}
