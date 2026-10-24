import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { CcCompetitors } from "@/components/cubing-contests/cc-competitors";
import { CcEventIcon } from "@/components/cubing-contests/cc-event-icon";
import { CcRecordBadge } from "@/components/cubing-contests/cc-record-badge";
import { formatCcResult } from "@/lib/cubing-contests";
import { formatDate } from "@/lib/utils";
import type { CcRecordHistoryRow } from "../../_lib/queries";

export function CcRecordHistoryTable({ rows }: { rows: CcRecordHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay historial de récords no oficiales para los filtros
        seleccionados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Resultado</TableHead>
            <TableHead>Competidor</TableHead>
            <TableHead>Competencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ key, type, marker, value, result }) => (
            <TableRow key={key}>
              <TableCell className="whitespace-nowrap">
                {formatDate(result.date, result.date)}
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <CcEventIcon
                    eventId={result.eventId}
                    eventName={result.eventName}
                    className="text-lg"
                  />
                  <span>{result.eventName}</span>
                </div>
              </TableCell>
              <TableCell>{type === "single" ? "Single" : "Average"}</TableCell>
              <TableCell className="text-right font-bold whitespace-nowrap">
                <CcRecordBadge marker={marker} className="mr-1.5" />
                {formatCcResult(result.eventFormat, value, type)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <CcCompetitors competitors={result.competitors} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Link
                  prefetch={false}
                  href={`/competitions/${result.competitionId}/results/unofficial?event=${result.eventId}`}
                  className="text-link hover:text-link/80"
                >
                  {result.competitionName}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
