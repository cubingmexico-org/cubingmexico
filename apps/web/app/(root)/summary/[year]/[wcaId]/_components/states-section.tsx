import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { StateLabel } from "@/components/state-flag";
import { AccentCell, Stat } from "../../../_components/summary-stat";
import type { AnnualSummary } from "../_lib/queries";

export function StatesSection({
  pronoun,
  states,
}: {
  pronoun: string;
  states: AnnualSummary["states"];
}) {
  if (states.visits.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Estados</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        {pronoun} compitió en <Stat>{states.visits.length}</Stat>{" "}
        {states.visits.length === 1 ? "estado" : "estados"}
        {states.firstTime.length > 0 && (
          <>
            , de los cuales <Stat>{states.firstTime.length}</Stat>{" "}
            {states.firstTime.length === 1 ? "fue nuevo" : "fueron nuevos"}
          </>
        )}
        .
      </p>
      {states.firstTime.length > 0 && (
        <p className="text-muted-foreground text-sm">
          Estados nuevos:{" "}
          {states.firstTime.map((s, index) => (
            <span key={s.stateId}>
              {index > 0 ? ", " : null}
              <StateLabel
                stateId={s.stateId}
                stateName={s.stateName}
                size={14}
              />
            </span>
          ))}
          .
        </p>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Veces</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {states.visits.map((row) => (
              <TableRow key={row.stateId}>
                <TableCell>
                  <StateLabel stateId={row.stateId} stateName={row.stateName} />
                </TableCell>
                <AccentCell>{row.times}</AccentCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function TravelKmSection({
  pronoun,
  year,
  travelKm,
}: {
  pronoun: string;
  year: number;
  travelKm: AnnualSummary["travelKm"];
}) {
  if (!(travelKm !== null && travelKm > 0)) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Kilómetros</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        Entre competencias consecutivas de {year}, {pronoun.toLowerCase()}{" "}
        recorrió aproximadamente <Stat>{travelKm.toLocaleString("es-MX")}</Stat>{" "}
        km (distancia en línea recta).
      </p>
    </section>
  );
}
