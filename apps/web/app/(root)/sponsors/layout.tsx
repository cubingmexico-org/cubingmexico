import { Suspense } from "react";
import { GROUPS_PUBLICLY_RELEASED } from "@/lib/groups";
import { requireSuperadmin } from "@/lib/superadmin";

async function SponsorsGate({ children }: { children: React.ReactNode }) {
  if (!GROUPS_PUBLICLY_RELEASED) {
    await requireSuperadmin();
  }
  return children;
}

export default function SponsorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <SponsorsGate>{children}</SponsorsGate>
    </Suspense>
  );
}
