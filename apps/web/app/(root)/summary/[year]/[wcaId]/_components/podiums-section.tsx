import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { MedalBreakdown } from "../../../_components/medal-breakdown";
import { Stat } from "../../../_components/summary-stat";
import {
  EventNameCell,
  MedalCells,
} from "../../../_components/summary-table-cells";
import { championshipLabel } from "../../../_lib/format";
import type { AnnualSummary } from "../_lib/queries";

export function PodiumsSection({
  pronoun,
  podiums,
}: {
  pronoun: string;
  podiums: AnnualSummary["podiums"];
}) {
  if (podiums.total <= 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Podios</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        {pronoun} estuvo en el podio <Stat>{podiums.total}</Stat>{" "}
        {podiums.total === 1 ? "vez" : "veces"} en <Stat>{podiums.events}</Stat>{" "}
        {podiums.events === 1 ? "evento" : "eventos"}, con{" "}
        <MedalBreakdown
          gold={podiums.gold}
          silver={podiums.silver}
          bronze={podiums.bronze}
        />
        .
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead className="text-center">Oro</TableHead>
              <TableHead className="text-center">Plata</TableHead>
              <TableHead className="text-center">Bronce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {podiums.byEvent.map((row) => (
              <TableRow key={row.eventId}>
                <EventNameCell
                  eventId={row.eventId}
                  eventName={row.eventName}
                />
                <MedalCells
                  gold={row.gold}
                  silver={row.silver}
                  bronze={row.bronze}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function ChampionshipPodiumsSection({
  pronoun,
  championshipPodiums,
}: {
  pronoun: string;
  championshipPodiums: AnnualSummary["championshipPodiums"];
}) {
  if (championshipPodiums.total <= 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Podios en campeonatos</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        {pronoun} subió al podio <Stat>{championshipPodiums.total}</Stat>{" "}
        {championshipPodiums.total === 1 ? "vez" : "veces"} en campeonatos:
        <Stat>{championshipPodiums.mx}</Stat> nacional
        {championshipPodiums.mx === 1 ? "" : "es"},{" "}
        <Stat>{championshipPodiums.nac}</Stat> NAC y{" "}
        <Stat>{championshipPodiums.world}</Stat> mundial
        {championshipPodiums.world === 1 ? "" : "es"}.
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campeonato</TableHead>
              <TableHead>Competencia</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead className="text-center">Posición</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {championshipPodiums.rows.map((row, index) => (
              <TableRow key={`${row.competitionName}-${row.eventId}-${index}`}>
                <TableCell>{championshipLabel(row.championshipType)}</TableCell>
                <TableCell>{row.competitionName}</TableCell>
                <EventNameCell
                  eventId={row.eventId}
                  eventName={row.eventName}
                />
                <TableCell
                  className={cn(
                    "text-center font-semibold",
                    row.position === 1 && "text-amber-500 dark:text-amber-400",
                    row.position === 2 && "text-slate-500 dark:text-slate-300",
                    row.position === 3 &&
                      "text-yellow-700 dark:text-yellow-600",
                  )}
                >
                  {row.position}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
