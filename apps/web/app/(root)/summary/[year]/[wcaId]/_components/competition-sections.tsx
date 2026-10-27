import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AccentCell, Stat } from "../../../_components/summary-stat";
import { EventNameCell } from "../../../_components/summary-table-cells";
import { formatSummaryDate } from "../../../_lib/format";
import type { AnnualSummary } from "../_lib/queries";

export function PrStreakSection({
  year,
  prStreak,
}: {
  year: number;
  prStreak: AnnualSummary["prStreak"];
}) {
  if (!(prStreak && prStreak.length > 0)) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Racha de PRs</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        La racha más larga de competencias consecutivas con PR en {year} fue de{" "}
        <Stat>{prStreak.length}</Stat>{" "}
        {prStreak.length === 1 ? "competencia" : "competencias"}.
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Competencia</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prStreak.competitions.map((comp, index) => (
              <TableRow key={comp.competitionId}>
                <AccentCell>{index + 1}</AccentCell>
                <TableCell>
                  <Link
                    prefetch={false}
                    href={`/competitions/${comp.competitionId}`}
                    className="text-link hover:text-link/80"
                  >
                    {comp.competitionName}
                  </Link>
                </TableCell>
                <TableCell>{formatSummaryDate(comp.startDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function SolvesSection({
  pronoun,
  solves,
}: {
  pronoun: string;
  solves: AnnualSummary["solves"];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Resoluciones / Intentos</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        {pronoun} intentó <Stat>{solves.totalAttempts}</Stat>{" "}
        {solves.totalAttempts === 1 ? "resolución" : "resoluciones"} y completó{" "}
        <Stat>{solves.totalSolves}</Stat>.
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead className="text-center">Resoluciones</TableHead>
              <TableHead className="text-center">Intentos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solves.byEvent.map((row) => (
              <TableRow key={row.eventId}>
                <EventNameCell
                  eventId={row.eventId}
                  eventName={row.eventName}
                />
                <AccentCell>{row.solves}</AccentCell>
                <AccentCell>{row.attempts}</AccentCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
