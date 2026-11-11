import { formatTime } from "@/lib/utils";
import type { TeamEventCutoff } from "../_lib/queries";
import { eventLabel } from "../_lib/format";
import {
  CUTOFF_CLOSE_MARGIN,
  CUTOFF_MEMBER_PERCENTILE,
  MIN_MEMBERS_FOR_CUTOFF,
} from "../_lib/cutoff";

export function TeamEventsCutoffs({
  cutoffs,
  stateName,
}: {
  cutoffs: TeamEventCutoff[];
  stateName: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sugerencia para las competencias de {stateName}: un cutoff que{" "}
        {Math.round(CUTOFF_MEMBER_PERCENTILE * 100)}% de los miembros pasa
        normalmente, según su mejor tiempo en los primeros intentos de cada
        ronda. Nunca supera el cutoff que suelen usar las competencias en
        México, para que sea realista en el horario. Solo se consideran eventos
        oficiales con al menos {MIN_MEMBERS_FOR_CUTOFF} miembros compitiendo.
      </p>
      {cutoffs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay suficientes resultados para sugerir cutoffs
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {cutoffs.map((c) => (
            <li
              key={c.eventId}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
            >
              <span className={`cubing-icon event-${c.eventId} shrink-0`} />
              <span className="min-w-0 grow font-medium">
                {eventLabel(c.eventId, c.eventName)}
              </span>
              <span className="font-semibold tabular-nums">
                {formatTime(c.cutoff)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  en {c.attempts} {c.attempts === 1 ? "intento" : "intentos"}
                </span>
              </span>
              <span className="basis-full text-xs text-muted-foreground tabular-nums sm:basis-auto">
                {c.passing} de {c.members} miembros lo pasan normalmente
                {c.close > 0
                  ? ` · ${c.close} a menos de ${Math.round(CUTOFF_CLOSE_MARGIN * 100)}%`
                  : ""}
                {c.capped ? " · cutoff habitual en México" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
