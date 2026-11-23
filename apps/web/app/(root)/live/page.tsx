import type { Metadata } from "next";
import Link from "next/link";
import { Radio } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { CompetitionLogo } from "@/components/competition-logo";
import { PageHeading } from "@/components/page-heading";
import { formatCityState } from "@/lib/format";
import { formatDate } from "@/lib/utils";
import { getInProgressLiveCompetitions } from "@/lib/live/queries";

export const metadata: Metadata = {
  title: "En vivo | Cubing México",
  description:
    "Resultados en vivo de competencias WCA en México, con enriquecimiento estatal.",
};

export default async function LiveHubPage() {
  const competitions = await getInProgressLiveCompetitions();

  return (
    <main className="grow container mx-auto px-4 py-8">
      <div className="mb-8 space-y-2">
        <PageHeading>
          <Radio className="size-7 shrink-0 text-brand" aria-hidden />
          En vivo
        </PageHeading>
        <p className="text-muted-foreground max-w-2xl">
          Resultados en tiempo casi real de competencias en México. Los tiempos
          se capturan en el sistema oficial de la WCA; aquí los mostramos con
          contexto mexicano.
        </p>
      </div>

      {competitions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No hay competencias en curso</CardTitle>
            <CardDescription>
              Cuando una competencia mexicana esté en progreso aparecerá aquí.
              Mientras tanto puedes revisar el calendario de competencias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/competitions"
              className={cn(buttonVariants({ variant: "outline" }))}
              prefetch={false}
            >
              Ver competencias
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((comp) => (
            <li key={comp.id}>
              <Link
                href={`/live/${comp.id}`}
                prefetch={false}
                className="block h-full rounded-xl border bg-card hover:bg-accent/40 transition-colors"
              >
                <div className="flex gap-4 p-4">
                  {comp.logo ? (
                    <CompetitionLogo
                      src={comp.logo}
                      alt=""
                      size={64}
                      className="rounded-md bg-muted"
                    />
                  ) : (
                    <div className="size-16 rounded-md bg-muted flex items-center justify-center">
                      <Radio className="size-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold leading-snug line-clamp-2">
                      {comp.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCityState(comp.cityName, comp.stateName)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(comp.startDate, comp.endDate)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
