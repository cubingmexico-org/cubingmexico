import Link from "next/link";
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
    <section className="px-4 py-10 sm:px-6 md:py-14">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground md:text-3xl">
          Próximas
        </h2>
        <Link
          href="/competitions"
          className="text-sm font-medium text-brand hover:text-brand-warm"
        >
          Ver todas
        </Link>
      </div>

      {competitions.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          No hay competencias próximas.{" "}
          <Link href="/competitions" className="text-brand hover:underline">
            Calendario
          </Link>
        </p>
      ) : (
        <ul className="mt-6">
          {competitions.map((comp) => {
            const location = [comp.cityName, comp.state]
              .filter(Boolean)
              .join(", ");

            return (
              <li key={comp.id} className="border-t border-border">
                <Link
                  prefetch={false}
                  href={`/competitions/${comp.id}`}
                  className="group flex items-start gap-3 py-4 transition-colors hover:bg-muted/50 sm:gap-4"
                >
                  <CompetitionLogo
                    src={comp.logo}
                    alt={`Logo de ${comp.name}`}
                    size={40}
                    className="mt-0.5 hidden sm:block"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground group-hover:text-brand">
                      {comp.name}
                    </h3>
                    {location ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {location}
                      </p>
                    ) : null}
                  </div>
                  <time
                    dateTime={new Date(comp.startDate).toISOString()}
                    className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-muted-foreground sm:text-sm"
                  >
                    {formatDate(comp.startDate, comp.endDate)}
                  </time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
