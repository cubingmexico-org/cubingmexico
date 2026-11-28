import { GroupPageSkeleton } from "../../groups/_components/group-page-skeleton";

export default function Loading() {
  return (
    <main className="min-w-0 grow overflow-x-clip">
      <GroupPageSkeleton />
    </main>
  );
}
