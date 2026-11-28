import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eventNames } from "@/lib/constants";
import { getGroupInfo } from "../../../../../groups/_lib/queries";
import { GroupRankings } from "../../../../../groups/_components/group-rankings";

type Props = {
  params: Promise<{ groupId: string; eventId: string; rankType: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId, eventId, rankType } = await params;
  const group = await getGroupInfo(groupId);
  const eventName = eventNames[eventId] ?? eventId;
  const rankLabel = rankType === "average" ? "Averages" : "Singles";
  return {
    title: `${group?.name ?? "Patrocinador"} · Ranking de ${eventName} · ${rankLabel} | Cubing México`,
  };
}

export default async function Page({ params }: Props) {
  const { groupId, eventId, rankType } = await params;
  if (rankType !== "single" && rankType !== "average") notFound();
  return (
    <GroupRankings
      groupId={groupId}
      kind="sponsor"
      eventId={eventId}
      rankType={rankType}
    />
  );
}
