import { Suspense } from "react";
import type { ReactNode } from "react";
import { TeamFrame } from "./_components/team-frame";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ stateId: string }>;
}) {
  return (
    <main className="grow">
      <Suspense fallback={null}>
        <TeamFrame params={params}>{children}</TeamFrame>
      </Suspense>
    </main>
  );
}
