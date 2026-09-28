import type { SearchParams } from "@/types";
import { Members } from "./_components/members";
import { MembersTableCard } from "./_components/members-table-card";
import { getMollerzMembers } from "./_lib/queries";
import { searchParamsCache } from "./_lib/validations";

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  const { scope } = searchParamsCache.parse(searchParams);
  const members = await getMollerzMembers(scope);

  return (
    <MembersTableCard scope={scope}>
      <Members members={members} />
    </MembersTableCard>
  );
}
