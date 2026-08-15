import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CompetitionLogo } from "@/components/competition-logo";
import { formatDate } from "@/lib/utils";

type UpcomingCompetition = {
  id: string;
  name: string;
  logo: string | null;
  state: string | null;
  cityName: string;
  startDate: Date;
  endDate: Date;
};

type HomeUpcomingCompetitionsProps = {
  competitions: UpcomingCompetition[];
};

export function HomeUpcomingCompetitions({
  competitions,
}: HomeUpcomingCompetitionsProps) {
  return (
    <section className="border-t border-border bg-background">
      <div className="container mx-auto px-5 py-20 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-foreground md:text-5xl">
              Próximas competencias
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Las próximas competencias oficiales de la WCA en México.
            </p>
          </div>
          <Link
            href="/competitions"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand-warm"
          >
            Ver todas
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {competitions.length === 0 ? (
          <p className="mt-12 text-base text-muted-foreground">
            No hay competencias próximas por ahora.{" "}
            <Link
              href="/competitions"
              className="font-medium text-brand underline-offset-4 hover:underline"
            >
              Consulta el calendario
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-12 divide-y divide-border border-t border-border">
            {competitions.map((comp) => {
              const location = [comp.cityName, comp.state]
                .filter(Boolean)
                .join(", ");

              return (
                <li key={comp.id}>
                  <Link
                    href={`/competitions/${comp.id}`}
                    className="group flex items-center gap-4 py-5 transition-colors hover:bg-muted/40 md:gap-6"
                  >
                    <CompetitionLogo
                      src={comp.logo}
                      alt={`Logo de ${comp.name}`}
                      size={48}
                      className="hidden sm:block"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl font-semibold uppercase tracking-wide text-foreground transition-colors group-hover:text-brand md:text-2xl">
                        {comp.name}
                      </h3>
                      {location ? (
                        <p className="mt-1 text-sm text-muted-foreground md:text-base">
                          {location}
                        </p>
                      ) : null}
                    </div>
                    <time
                      dateTime={new Date(comp.startDate).toISOString()}
                      className="shrink-0 text-sm font-medium text-muted-foreground md:text-base"
                    >
                      {formatDate(comp.startDate, comp.endDate)}
                    </time>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
