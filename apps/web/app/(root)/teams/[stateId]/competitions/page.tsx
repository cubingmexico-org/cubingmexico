import type { Metadata } from "next";
import Link from "next/link";
import { getTeam } from "@/db/queries";
import { buttonVariants } from "@workspace/ui/components/button";
import { Calendar, MapPin } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getCompetitionsPageData } from "./_lib/queries";
import { CompetitionLogo } from "@/components/competition-logo";

type Props = {
  params: Promise<{ stateId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stateId = (await params).stateId;
  const team = await getTeam(stateId);

  return {
    title: `${team?.name} | Competencias | Cubing México`,
    description: `${team?.name} es un equipo de ${team?.state} que compite en competencias de la World Cube Association.`,
  };
}

function CompetitionItem({
  competition,
}: {
  competition: Awaited<
    ReturnType<typeof getCompetitionsPageData>
  >["competitions"][number];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start">
      <CompetitionLogo
        src={competition.logo}
        alt={`Logo de ${competition.name}`}
        size={40}
        className="rounded-md"
      />
      <div className="grow space-y-2">
        <h3 className="font-semibold leading-snug">
          <Link
            href={`/competitions/${competition.id}`}
            className="text-link hover:text-link/80"
          >
            {competition.name}
          </Link>
        </h3>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            {competition.startDate.toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "UTC",
            })}
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="line-clamp-2">
              <ReactMarkdown
                components={{
                  a: ({ children, href }) => (
                    <Link
                      className="hover:underline"
                      href={href ?? ""}
                      target="_blank"
                    >
                      {children}
                    </Link>
                  ),
                  p: ({ children }) => <>{children}</>,
                }}
              >
                {competition.venue}
              </ReactMarkdown>
              , {competition.cityName}
            </span>
          </div>
        </div>
      </div>
      <Link
        href={`/competitions/${competition.id}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Ver detalles
      </Link>
    </div>
  );
}

function CompetitionColumn({
  title,
  emptyMessage,
  competitions,
}: {
  title: string;
  emptyMessage: string;
  competitions: Awaited<
    ReturnType<typeof getCompetitionsPageData>
  >["competitions"];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {competitions.length}{" "}
          {competitions.length === 1 ? "competencia" : "competencias"}
        </p>
      </div>
      <div className="space-y-3">
        {competitions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : null}
        {competitions.map((competition) => (
          <CompetitionItem key={competition.id} competition={competition} />
        ))}
      </div>
    </section>
  );
}

export default async function Page(props: {
  params: Promise<{ stateId: string }>;
}) {
  const stateId = (await props.params).stateId;
  const { upcomingCompetitions, pastCompetitions } =
    await getCompetitionsPageData(stateId);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <CompetitionColumn
        title="Próximas"
        emptyMessage="No hay competencias próximas"
        competitions={upcomingCompetitions}
      />
      <CompetitionColumn
        title="Pasadas"
        emptyMessage="No hay competencias pasadas"
        competitions={pastCompetitions}
      />
    </div>
  );
}
