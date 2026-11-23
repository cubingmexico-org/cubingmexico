import type { Metadata } from "next";
import { getGroupInfo } from "../../../groups/_lib/queries";
import { GroupKinch } from "../../../groups/_components/group-kinch";
import type { SearchParams } from "@/types";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params;
  const group = await getGroupInfo(groupId);
  return {
    title: `${group?.name ?? "Patrocinador"} | Kinch | Cubing México`,
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { groupId } = await params;
  return (
    <GroupKinch
      groupId={groupId}
      kind="sponsor"
      searchParams={await searchParams}
    />
  );
}
