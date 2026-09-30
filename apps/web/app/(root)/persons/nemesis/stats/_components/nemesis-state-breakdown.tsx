import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { StateLabel } from "@/components/state-flag";
import type { getNemesisStateBreakdown } from "../_lib/queries";

const numberFormat = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 1,
});

export function NemesisStateBreakdown({
  rows,
}: {
  rows: Awaited<ReturnType<typeof getNemesisStateBreakdown>>;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        Aún no hay estadísticas por estado.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Competidores</TableHead>
          <TableHead className="text-right">Invictos</TableHead>
          <TableHead className="text-right hidden sm:table-cell">
            % invictos
          </TableHead>
          <TableHead className="text-right">Némesis promedio</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.stateId}>
            <TableCell>
              <StateLabel stateId={row.stateId} stateName={row.state} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {numberFormat.format(row.competitors)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-semibold">
              {numberFormat.format(row.invictos)}
            </TableCell>
            <TableCell className="text-right tabular-nums hidden sm:table-cell">
              {numberFormat.format(
                row.competitors > 0 ? (row.invictos / row.competitors) * 100 : 0,
              )}
              %
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {numberFormat.format(row.averageNemeses)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
