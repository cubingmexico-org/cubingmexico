import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AccentCell } from "../../../../_components/summary-stat";
import { PersonLink } from "../../../../_components/summary-table-cells";
import type { TeamSummaryCompetitorCount } from "../_lib/queries";

export function PersonCountTable({
  rows,
}: {
  rows: TeamSummaryCompetitorCount[];
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Persona</TableHead>
            <TableHead className="text-center">Competencias</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.wcaId}>
              <TableCell>
                <PersonLink wcaId={row.wcaId} name={row.name} />
              </TableCell>
              <AccentCell>{row.competitions}</AccentCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
