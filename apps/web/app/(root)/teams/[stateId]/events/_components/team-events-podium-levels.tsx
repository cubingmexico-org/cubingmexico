import { formatAttemptValue } from "@/lib/utils";
import type { TeamPodiumLevel } from "../_lib/queries";
import { eventLabel } from "../_lib/format";
import { MIN_FINALS_FOR_PODIUM_LEVEL } from "../_lib/podium";

export function TeamEventsPodiumLevels({
  levels,
  stateName,
}: {
  levels: TeamPodiumLevel[];
  stateName: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Resultado típico de 1er y 3er lugar en las finales de las competencias
        de {stateName}, en promedio o single según el formato del evento. Un
        miembro tiene nivel de podio si su récord personal es mejor que el 3er
        lugar típico. Solo se muestran eventos con al menos{" "}
        {MIN_FINALS_FOR_PODIUM_LEVEL} finales y solo se cuentan competidores
        mexicanos.
      </p>
      {levels.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay suficientes finales en este periodo
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {levels.map((l) => (
            <li
              key={l.eventId}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
            >
              <span className={`cubing-icon event-${l.eventId} shrink-0`} />
              <span className="min-w-0 grow font-medium">
                {eventLabel(l.eventId, l.eventName)}
              </span>
              <span className="tabular-nums">
                <span className="text-xs text-muted-foreground">1er </span>
                <span className="font-semibold">
                  {formatAttemptValue(l.eventId, l.first, l.kind)}
                </span>
                {l.third !== null ? (
                  <>
                    <span className="mx-1 text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">3er </span>
                    <span className="font-semibold">
                      {formatAttemptValue(l.eventId, l.third, l.kind)}
                    </span>
                  </>
                ) : null}
                <span className="ml-1 text-xs text-muted-foreground">
                  {l.kind === "average" ? "promedio" : "single"}
                </span>
              </span>
              <span className="basis-full text-xs text-muted-foreground tabular-nums sm:basis-auto">
                en {l.finals} {l.finals === 1 ? "final" : "finales"}
                {l.third !== null
                  ? ` · ${l.membersAtLevel} ${l.membersAtLevel === 1 ? "miembro ya tiene" : "miembros ya tienen"} nivel de podio`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
