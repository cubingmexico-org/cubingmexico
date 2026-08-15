import { Suspense } from "react";
import type { ReactNode } from "react";
import { TeamFrame } from "./_components/team-frame";
import { TeamPageSkeleton } from "./loading";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ stateId: string }>;
}) {
  return (
    <main className="min-w-0 grow overflow-x-clip">
      <Suspense fallback={<TeamPageSkeleton />}>
        <TeamFrame params={params}>{children}</TeamFrame>
      </Suspense>
    </main>
  );
}
