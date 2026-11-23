import type { Metadata } from "next";
import { Suspense } from "react";
import { Radio } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { PageHeading } from "@/components/page-heading";
import { LiveHubList } from "./_components/live-hub-list";

export const metadata: Metadata = {
  title: "En vivo | Cubing México",
  description:
    "Resultados en vivo de competencias WCA en México, con enriquecimiento estatal.",
};

export default function LiveHubPage() {
  return (
    <main className="container mx-auto grow px-4 py-8">
      <div className="mb-8 space-y-2">
        <PageHeading>
          <Radio className="size-7 shrink-0 text-brand" aria-hidden />
          En vivo
        </PageHeading>
        <p className="max-w-2xl text-muted-foreground">
          Resultados en tiempo casi real de competencias en México. Los tiempos
          se capturan en el sistema oficial de la WCA; aquí los mostramos con
          contexto mexicano.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        }
      >
        <LiveHubList />
      </Suspense>
    </main>
  );
}
