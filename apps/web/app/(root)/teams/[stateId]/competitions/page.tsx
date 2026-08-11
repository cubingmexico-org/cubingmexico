import type { Metadata } from "next";
import Link from "next/link";
import { getTeam } from "@/db/queries";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Calendar, MapPin } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getCompetitionsPageData } from "./_lib/queries";

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
    <div className="flex items-start gap-4 rounded-lg border p-4">
      <Calendar className="h-6 w-6" />
      <div className="grow">
        <h3 className="font-semibold">
          <Link
            href={`/competitions/${competition.id}`}
            className="text-link hover:text-link/80"
          >
            {competition.name}
          </Link>
        </h3>
        <div className="mt-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            {competition.startDate.toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="mt-1 flex items-center">
            <MapPin className="mr-2 h-4 w-4" />
            <span className="line-clamp-1">
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
        className={buttonVariants({ variant: "default" })}
      >
        Ver detalles
      </Link>
    </div>
  );
}

export default async function Page(props: {
  params: Promise<{ stateId: string }>;
}) {
  const stateId = (await props.params).stateId;
  const { upcomingCompetitions, pastCompetitions } =
    await getCompetitionsPageData(stateId);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Próximas competencias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {upcomingCompetitions.length === 0 ? (
              <p className="text-muted-foreground">
                No hay competencias próximas
              </p>
            ) : null}
            {upcomingCompetitions.map((competition) => (
              <CompetitionItem key={competition.id} competition={competition} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Competencias pasadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {pastCompetitions.length === 0 ? (
              <p className="text-muted-foreground">
                No hay competencias pasadas
              </p>
            ) : null}
            {pastCompetitions.map((competition) => (
              <CompetitionItem key={competition.id} competition={competition} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
