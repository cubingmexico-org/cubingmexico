import { Suspense } from "react";
import { requireSuperadmin } from "@/lib/superadmin";
import { AdminNav } from "./_components/admin-nav";
import { AdminPageSkeleton } from "./loading";

async function AdminShell({ children }: { children: React.ReactNode }) {
  await requireSuperadmin();

  return (
    <main className="grow container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Superadmin</h1>
          <p className="text-muted-foreground text-sm">
            Panel interno de Cubing México
          </p>
        </div>
        <AdminNav />
      </div>
      {children}
    </main>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="grow container mx-auto px-4 py-8 max-w-5xl">
          <AdminPageSkeleton />
        </main>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
