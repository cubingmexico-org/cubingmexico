import type { TeamEventInsight } from "../_lib/queries";
import { eventLabel, formatShare } from "../_lib/format";
import { MIN_MEMBERS_FOR_RECOMMENDATION } from "../_lib/recommendation";

function RecommendationList({
  title,
  description,
  events,
  emptyMessage,
}: {
  title: string;
  description: string;
  events: TeamEventInsight[];
  emptyMessage: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
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
                {e.members} miembros · {formatShare(e.demandShare)} de
                participación · {formatShare(e.supplyShare)} de rondas
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TeamEventsRecommendations({
  events,
  stateName,
  hostedRounds,
}: {
  events: TeamEventInsight[];
  stateName: string;
  hostedRounds: number;
}) {
  const underServed = events
    .filter((e) => e.recommendation === "more_rounds")
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));
  const overServed = events
    .filter((e) => e.recommendation === "overrepresented")
    .sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Compara qué parte de las participaciones de los miembros corresponde a
        cada evento contra qué parte de las rondas organizadas en {stateName}{" "}
        tiene ese evento. Solo se recomiendan eventos oficiales con al menos{" "}
        {MIN_MEMBERS_FOR_RECOMMENDATION} miembros compitiendo.
      </p>
      {hostedRounds === 0 ? (
        <p className="text-sm text-muted-foreground">
          {stateName} no organizó competencias en este periodo, así que todos
          los eventos con participación aparecen como faltantes.
        </p>
      ) : null}
      <div className="grid gap-6 md:grid-cols-2">
        <RecommendationList
          title="Necesitan más rondas"
          description="Más participación que rondas en el estado"
          events={underServed}
          emptyMessage="Ningún evento está por debajo de su demanda"
        />
        <RecommendationList
          title="Sobrerrepresentados"
          description="Más rondas en el estado que participación"
          events={overServed}
          emptyMessage="Ningún evento tiene rondas de sobra"
        />
      </div>
    </div>
  );
}
