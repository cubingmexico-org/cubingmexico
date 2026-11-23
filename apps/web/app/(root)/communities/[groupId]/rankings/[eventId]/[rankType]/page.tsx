import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGroupInfo } from "../../../../../groups/_lib/queries";
import { GroupRankings } from "../../../../../groups/_components/group-rankings";

type Props = {
  params: Promise<{ groupId: string; eventId: string; rankType: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId, eventId, rankType } = await params;
  const group = await getGroupInfo(groupId);
  return {
    title: `${group?.name ?? "Comunidad"} | Rankings ${eventId} ${rankType} | Cubing México`,
  };
}

export default async function Page({ params }: Props) {
  const { groupId, eventId, rankType } = await params;
  if (rankType !== "single" && rankType !== "average") notFound();
  return (
    <GroupRankings
      groupId={groupId}
      kind="community"
      eventId={eventId}
      rankType={rankType}
    />
  );
}
