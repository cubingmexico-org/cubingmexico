import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { CompetitionLogo } from "@/components/competition-logo";
import type { TeamOverviewData } from "../_lib/queries";

export function TeamUpcomingCompetitionsCard({
  stateId,
  competitions,
}: {
  stateId: string;
  competitions: TeamOverviewData["upcomingCompetitions"];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Próximas competencias</CardTitle>
        <Link
          href={`/teams/${stateId}/competitions`}
          prefetch={false}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1",
          )}
        >
          Ver todas
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {competitions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay competencias próximas
          </p>
        ) : (
          <div className="space-y-4">
            {competitions.map((competition) => (
              <div
                key={competition.id}
                className="flex items-start gap-3 space-y-0"
              >
                <CompetitionLogo
                  src={competition.logo}
                  alt={`Logo de ${competition.name}`}
                  size={36}
                  className="mt-0.5 rounded-md"
                />
                <div className="min-w-0 grow space-y-1.5">
                  <h3 className="font-semibold leading-snug">
                    <Link
                      prefetch={false}
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
