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
import { formatCityState } from "@/lib/format";
import { formatDate } from "@/lib/utils";
import { getInProgressLiveCompetitions } from "@/lib/live/queries";

/** Fetches in-progress comps; must sit under `<Suspense>` (uses `connection()`). */
export async function LiveHubList() {
  const competitions = await getInProgressLiveCompetitions();

  if (competitions.length === 0) {
    return (
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
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {competitions.map((comp) => (
        <li key={comp.id}>
          <Link
            href={`/live/${comp.id}`}
            prefetch={false}
            className="block h-full rounded-xl border bg-card transition-colors hover:bg-accent/40"
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
                <div className="flex size-16 items-center justify-center rounded-md bg-muted">
                  <Radio className="size-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <p className="line-clamp-2 font-semibold leading-snug">
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
  );
}
