import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AccentCell } from "../../../_components/summary-stat";
import { EventNameCell } from "../../../_components/summary-table-cells";
import { prevYearLabel } from "../_lib/format";
import type { AnnualSummary } from "../_lib/queries";

export function RankProgressSection({
  year,
  rankProgress,
}: {
  year: number;
  rankProgress: AnnualSummary["rankProgress"];
}) {
  if (rankProgress.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Rankings</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        Eventos donde mejoró su lugar NR y/o SR durante {year}.
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead className="text-center">
                NR {prevYearLabel(year)}
              </TableHead>
              <TableHead className="text-center">NR {year}</TableHead>
              <TableHead className="text-center">
                SR {prevYearLabel(year)}
              </TableHead>
              <TableHead className="text-center">SR {year}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankProgress.map((row) => (
              <TableRow key={`${row.eventId}-${row.type}`}>
                <EventNameCell
                  eventId={row.eventId}
                  eventName={row.eventName}
                />
                <TableCell className="text-center capitalize">
                  {row.type}
                </TableCell>
                <TableCell className="text-center">
                  {row.nrBefore ?? "—"}
                </TableCell>
                <AccentCell>{row.nrAfter ?? "—"}</AccentCell>
                <TableCell className="text-center">
                  {row.srBefore ?? "—"}
                </TableCell>
                <AccentCell>{row.srAfter ?? "—"}</AccentCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
