import type { SearchParams } from "@/types";
import { AlmostBronzeCard } from "./_components/almost-bronze-card";
import { AlmostBronzeMembers } from "./_components/almost-bronze-members";
import { Members } from "./_components/members";
import { MembersTableCard } from "./_components/members-table-card";
import { getAlmostBronzeMembers, getMollerzMembers } from "./_lib/queries";
import { searchParamsCache } from "./_lib/validations";

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  const { scope } = searchParamsCache.parse(searchParams);
  const [members, almostBronze] = await Promise.all([
    getMollerzMembers(scope),
    getAlmostBronzeMembers(),
  ]);

  return (
    <>
      <MembersTableCard scope={scope}>
        <Members members={members} />
      </MembersTableCard>
      <AlmostBronzeCard>
        <AlmostBronzeMembers members={almostBronze} />
      </AlmostBronzeCard>
    </>
  );
}
