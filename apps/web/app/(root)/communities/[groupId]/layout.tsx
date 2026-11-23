import type { ReactNode } from "react";
import { Suspense } from "react";
import { GroupFrame } from "../../groups/_components/group-frame";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return (
    <main className="min-w-0 grow overflow-x-clip">
      <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Cargando…</div>}>
        <GroupFrame groupId={groupId} expectedKind="community">
          {children}
        </GroupFrame>
      </Suspense>
    </main>
  );
}
