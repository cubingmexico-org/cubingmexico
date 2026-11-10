import type { TeamEventInsight } from "../_lib/queries";
import { eventLabel, formatShare } from "../_lib/format";
import { MIN_MEMBERS_FOR_RECOMMENDATION } from "../_lib/recommendation";

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
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Eventos que compite un porcentaje de los miembros activos mucho mayor
        que el porcentaje de competencias de {stateName} que los incluye. Solo
        se consideran eventos oficiales con al menos{" "}
        {MIN_MEMBERS_FOR_RECOMMENDATION} miembros compitiendo.
      </p>
      {hostedCompetitions === 0 ? (
        <p className="text-sm text-muted-foreground">
          {stateName} no organizó competencias en este periodo, así que todos
          los eventos con participación aparecen como faltantes.
        </p>
      ) : null}
      {underServed.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ningún evento está por debajo de su demanda
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {underServed.map((e) => (
            <li
              key={e.eventId}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
            >
              <span className={`cubing-icon event-${e.eventId} shrink-0`} />
              <span className="min-w-0 grow font-medium">
                {eventLabel(e.eventId, e.eventName)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {e.members} miembros ({formatShare(e.demandShare)}) · en{" "}
                {e.competitionsHosted} competencias (
                {formatShare(e.supplyShare)})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
