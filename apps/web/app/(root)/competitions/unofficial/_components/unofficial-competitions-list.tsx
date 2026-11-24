import Link from "next/link";
import { Calendar, MapPin, Shapes } from "lucide-react";
import { buttonVariants } from "@workspace/ui/components/button";
import { CompetitionLogo } from "@/components/competition-logo";
import { CcEventIcon } from "@/components/cubing-contests/cc-event-icon";
import { StateLabel } from "@/components/state-flag";
import { formatDate } from "@/lib/utils";
import type { CompetitionWithUnofficialEvents } from "../_lib/queries";

function CompetitionItem({
  competition,
}: {
  competition: CompetitionWithUnofficialEvents;
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
        <h2 className="font-semibold leading-snug">
          <Link
            prefetch={false}
            href={`/competitions/${competition.id}`}
            className="text-link hover:text-link/80"
          >
            {competition.name}
          </Link>
        </h2>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            {formatDate(competition.startDate, competition.endDate)}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>
              {competition.cityName}
              {competition.stateName ? (
                <>
                  {" · "}
                  <StateLabel
                    stateId={competition.stateId}
                    stateName={competition.stateName}
                  />
                </>
              ) : null}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Shapes className="h-4 w-4 shrink-0" />
            {competition.events.map((event) => (
              <span
                key={event.id}
                className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs text-foreground"
              >
                <CcEventIcon
                  eventId={event.id}
                  eventName={event.name}
                  className="text-sm"
                />
                {event.name}
              </span>
            ))}
          </div>
        </div>
      </div>
      <Link
        prefetch={false}
        href={`/competitions/${competition.id}/results/unofficial`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Ver no oficiales
      </Link>
    </div>
  );
}

export function UnofficialCompetitionsList({
  competitions,
}: {
  competitions: CompetitionWithUnofficialEvents[];
}) {
  if (competitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay competencias con eventos no oficiales todavía.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {competitions.length}{" "}
        {competitions.length === 1 ? "competencia" : "competencias"}
      </p>
      {competitions.map((competition) => (
        <CompetitionItem key={competition.id} competition={competition} />
      ))}
    </div>
  );
}
