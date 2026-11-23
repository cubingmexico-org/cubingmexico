import type { Metadata } from "next";
import { getGroupInfo } from "../../../groups/_lib/queries";
import { GroupRecords } from "../../../groups/_components/group-records";

type Props = { params: Promise<{ groupId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params;
  const group = await getGroupInfo(groupId);
  return {
    title: `${group?.name ?? "Patrocinador"} | Récords | Cubing México`,
  };
}

export default async function Page({ params }: Props) {
  const { groupId } = await params;
  return <GroupRecords groupId={groupId} kind="sponsor" />;
}
