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
import {
  formatImprovement,
  formatResultValue,
  prevYearLabel,
} from "../_lib/format";
import type { AnnualSummary, PrImprovement } from "../_lib/queries";

function ImprovementTable({
  title,
  year,
  rows,
  resultType,
}: {
  title: string;
  year: number;
  rows: PrImprovement[];
  resultType: "single" | "average";
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead className="text-center">
                {prevYearLabel(year)}
              </TableHead>
              <TableHead className="text-center">{year}</TableHead>
              <TableHead className="text-center">Mejora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.eventId}>
                <EventNameCell
                  eventId={row.eventId}
                  eventName={row.eventName}
                />
                <TableCell className="text-center">
                  {formatResultValue(row.eventId, row.before, resultType)}
                </TableCell>
                <AccentCell>
                  {formatResultValue(row.eventId, row.during, resultType)}
                </AccentCell>
                <AccentCell>
                  {formatImprovement(
                    row.eventId,
                    row.improvement,
                    row.improvementPercent,
                    resultType,
                  )}
                </AccentCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function PersonalBestsSection({
  pronoun,
  year,
  personalBests,
}: {
  pronoun: string;
  year: number;
  personalBests: AnnualSummary["personalBests"];
}) {
  if (personalBests.totalBreaks <= 0) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Récords personales</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          {pronoun} mejoró sus récords personales{" "}
          <Stat>{personalBests.totalBreaks}</Stat>{" "}
          {personalBests.totalBreaks === 1 ? "vez" : "veces"} en{" "}
          <Stat>{personalBests.events}</Stat>{" "}
          {personalBests.events === 1 ? "evento" : "eventos"}, con{" "}
          <Stat>{personalBests.singleBreaks}</Stat>{" "}
          {personalBests.singleBreaks === 1 ? "single" : "singles"} y{" "}
          <Stat>{personalBests.averageBreaks}</Stat>{" "}
          {personalBests.averageBreaks === 1 ? "average" : "averages"}.
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead className="text-center">Veces</TableHead>
                <TableHead className="text-center">Single</TableHead>
                <TableHead className="text-center">Average</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personalBests.byEvent.map((row) => (
                <TableRow key={row.eventId}>
                  <EventNameCell
                    eventId={row.eventId}
                    eventName={row.eventName}
                  />
                  <AccentCell>{row.times}</AccentCell>
                  <AccentCell>{row.single}</AccentCell>
                  <AccentCell>{row.average}</AccentCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {personalBests.singleImprovements.length > 0 && (
        <ImprovementTable
          title="Mejoras de single"
          year={year}
          rows={personalBests.singleImprovements}
          resultType="single"
        />
      )}

      {personalBests.averageImprovements.length > 0 && (
        <ImprovementTable
          title="Mejoras de average"
          year={year}
          rows={personalBests.averageImprovements}
          resultType="average"
        />
      )}
    </section>
  );
}
