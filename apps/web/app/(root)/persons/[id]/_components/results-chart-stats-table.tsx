import type { ReactNode } from "react";
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
import type { SessionStats } from "../_lib/results-chart-points";

function StatRow({
  label,
  global,
  last = "—",
}: {
  label: ReactNode;
  global: ReactNode;
  last?: ReactNode;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell className="text-right font-mono">{global}</TableCell>
      <TableCell className="text-right font-mono">{last}</TableCell>
    </TableRow>
  );
}

export function ResultsChartStatsTable({
  eventId,
  stats,
}: {
  eventId: string;
  stats: SessionStats;
}) {
  const format = (value: number | null) => formatDisplayValue(eventId, value);

  return (
    <div className="mt-8 rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-45">Σ</TableHead>
            <TableHead className="text-right">Global</TableHead>
            <TableHead className="text-right">Último</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <StatRow label="Desviación" global={format(stats.global.deviation)} />
          <StatRow
            label="Ao12"
            global={format(stats.global.ao12)}
            last={format(stats.last.ao12)}
          />
          <StatRow
            label="Ao50"
            global={format(stats.global.ao50)}
            last={format(stats.last.ao50)}
          />
          <StatRow
            label="Ao100"
            global={format(stats.global.ao100)}
            last={format(stats.last.ao100)}
          />
          <StatRow label="Mejor" global={format(stats.global.best)} />
          <StatRow label="Peor" global={format(stats.global.worst)} />
          <StatRow label="Media" global={format(stats.global.mean)} />
          <StatRow
            label={totalLabel(eventId)}
            global={formatTotalTime(eventId, stats.global.totalTime)}
          />
          <StatRow
            label="Total resoluciones"
            global={
              <>
                {stats.global.validCount.toLocaleString("es-MX")}/
                {stats.global.count.toLocaleString("es-MX")}
              </>
            }
          />
        </TableBody>
      </Table>
    </div>
  );
}
