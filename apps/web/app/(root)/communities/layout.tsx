import { Suspense } from "react";
import { COMMUNITIES_PUBLICLY_RELEASED } from "@/lib/groups";
import { requireSuperadmin } from "@/lib/superadmin";

async function CommunitiesGate({ children }: { children: React.ReactNode }) {
  if (!COMMUNITIES_PUBLICLY_RELEASED) {
    await requireSuperadmin();
  }
  return children;
}

export default function CommunitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <CommunitiesGate>{children}</CommunitiesGate>
    </Suspense>
  );
}
