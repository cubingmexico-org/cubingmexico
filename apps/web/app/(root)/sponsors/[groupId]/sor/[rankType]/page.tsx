import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGroupInfo } from "../../../../groups/_lib/queries";
import { GroupSOR } from "../../../../groups/_components/group-sor";
import type { SearchParams } from "@/types";

type Props = {
  params: Promise<{ groupId: string; rankType: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId, rankType } = await params;
  const group = await getGroupInfo(groupId);
  return {
    title: `${group?.name ?? "Patrocinador"} | SOR ${rankType} | Cubing México`,
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { groupId, rankType } = await params;
  if (rankType !== "single" && rankType !== "average") notFound();
  return (
    <GroupSOR
      groupId={groupId}
      kind="sponsor"
      rankType={rankType}
      searchParams={await searchParams}
    />
  );
}
