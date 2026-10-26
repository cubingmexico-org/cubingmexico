import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { AnnualSummary } from "../[year]/[wcaId]/_lib/queries";
import type { TeamAnnualSummary } from "../team/[year]/[stateId]/_lib/queries";
import { AccentCell } from "./summary-stat";
import { EventNameCell } from "./summary-table-cells";

export function SrByEventTable({
  rows,
}: {
  rows:
    | AnnualSummary["records"]["byEventSr"]
    | TeamAnnualSummary["members"]["records"]["byEventSr"];
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead className="text-center">SR single</TableHead>
            <TableHead className="text-center">SR average</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.eventId}>
              <EventNameCell eventId={row.eventId} eventName={row.eventName} />
              <AccentCell>{row.single || ""}</AccentCell>
              <AccentCell>{row.average || ""}</AccentCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
