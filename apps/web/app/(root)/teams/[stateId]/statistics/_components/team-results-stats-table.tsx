import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  formatDisplayValue,
  formatTotalTime,
  totalLabel,
} from "@/lib/solve-chart";
import type { TeamSolveStats } from "../_lib/solve-points";

export function TeamResultsStatsTable({
  eventId,
  stats,
}: {
  eventId: string;
  stats: TeamSolveStats;
}) {
  const rows: { label: string; value: string }[] = [
    {
      label: "Desviación",
      value: formatDisplayValue(eventId, stats.deviation),
    },
    { label: "SR / Mejor", value: formatDisplayValue(eventId, stats.best) },
    { label: "Peor", value: formatDisplayValue(eventId, stats.worst) },
    { label: "Media", value: formatDisplayValue(eventId, stats.mean) },
    {
      label: totalLabel(eventId),
      value: formatTotalTime(eventId, stats.totalTime),
    },
    {
      label: "Mejoras de SR",
      value: stats.stateRecordCount.toLocaleString("es-MX"),
    },
    {
      label: "Total resoluciones",
      value: `${stats.validCount.toLocaleString("es-MX")}/${stats.count.toLocaleString("es-MX")}`,
    },
  ];

  return (
    <div className="mt-8 rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-50">Σ</TableHead>
            <TableHead className="text-right">Team</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell className="text-right font-mono">
                {row.value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
