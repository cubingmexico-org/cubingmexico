import type { ReactNode } from "react";
import { Suspense } from "react";
import { GroupFrame } from "../../groups/_components/group-frame";
import { GroupPageSkeleton } from "../../groups/_components/group-page-skeleton";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  return (
    <main className="min-w-0 grow overflow-x-clip">
      <Suspense fallback={<GroupPageSkeleton />}>
        <GroupFrame params={params} expectedKind="sponsor">
          {children}
        </GroupFrame>
      </Suspense>
    </main>
  );
}
