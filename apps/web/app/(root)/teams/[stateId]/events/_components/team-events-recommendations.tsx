import type { ReactNode } from "react";
import type { TeamEventInsight } from "../_lib/queries";
import { eventLabel, formatShare } from "../_lib/format";
import {
  MIN_MEMBERS_FOR_RECOMMENDATION,
  RECOMMENDATION_LABELS,
} from "../_lib/recommendation";

function EventList({
  events,
  detail,
}: {
  events: TeamEventInsight[];
  detail: (e: TeamEventInsight) => ReactNode;
}) {
  return (
    <ul className="divide-y rounded-lg border">
      {events.map((e) => (
        <li
          key={e.eventId}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
        >
          <span className={`cubing-icon event-${e.eventId} shrink-0`} />
          <span className="min-w-0 grow font-medium">
            {eventLabel(e.eventId, e.eventName)}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {detail(e)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TeamEventsRecommendations({
  events,
  stateName,
  hostedCompetitions,
}: {
  events: TeamEventInsight[];
  stateName: string;
  hostedCompetitions: number;
}) {
  const underServed = events
    .filter((e) => e.recommendation === "more_rounds")
    .sort((a, b) => (a.coverage ?? 0) - (b.coverage ?? 0));
  const overOffered = events
    .filter(
      (e) =>
        e.recommendation === "frequency" || e.recommendation === "over_offered",
    )
    .sort((a, b) => (b.coverage ?? 0) - (a.coverage ?? 0));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        El interés es qué tanto compiten los miembros un evento cuando está en
        una competencia a la que van, así no crece solo porque el evento se
        organice seguido. Cada evento se compara contra los demás: qué tan
        seguido lo incluyen las competencias de {stateName} frente a su interés.
        Solo se consideran eventos oficiales con al menos{" "}
        {MIN_MEMBERS_FOR_RECOMMENDATION} miembros compitiendo.
      </p>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Necesitan más rondas</h3>
        {hostedCompetitions === 0 ? (
          <p className="text-sm text-muted-foreground">
            {stateName} no organizó competencias en este periodo, así que todos
            los eventos con participación aparecen como faltantes.
          </p>
        ) : null}
        {underServed.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ningún evento está por debajo de su interés
          </p>
        ) : (
          <EventList
            events={underServed}
            detail={(e) => (
              <>
                {formatShare(e.interest)} lo compite cuando se ofrece · en{" "}
                {e.competitionsHosted} competencias (
                {formatShare(e.supplyShare)})
              </>
            )}
          />
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">
          Se organizan más de lo que se compiten
        </h3>
        <p className="text-sm text-muted-foreground">
          Su participación se explica en buena parte por lo seguido que están en
          las competencias. Los marcados como{" "}
          {RECOMMENDATION_LABELS.frequency.toLowerCase()} parecen de los más
          populares del equipo solo por eso.
        </p>
        {overOffered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ningún evento se ofrece de más
          </p>
        ) : (
          <EventList
            events={overOffered}
            detail={(e) => (
              <>
                {e.recommendation === "frequency" ? (
                  <span className="mr-1 font-medium text-sky-700 dark:text-sky-400">
                    {RECOMMENDATION_LABELS.frequency} ·
                  </span>
                ) : null}
                {e.members} miembros ({formatShare(e.demandShare)}) · está en{" "}
                {formatShare(e.exposure)} de las competencias a las que van ·{" "}
                {formatShare(e.interest)} lo compite cuando se ofrece
              </>
            )}
          />
        )}
      </section>
    </div>
  );
}
