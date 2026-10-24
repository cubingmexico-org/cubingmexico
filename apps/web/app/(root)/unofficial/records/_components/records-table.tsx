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
import { formatCcResult } from "@/lib/cubing-contests";
import { formatDate } from "@/lib/utils";
import type { CcRecordRow } from "../../_lib/ranking";

export function CcRecordsTable({ records }: { records: CcRecordRow[] }) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay récords no oficiales para los filtros seleccionados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Resultado</TableHead>
            <TableHead>Competidor</TableHead>
            <TableHead>Competencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={`${record.eventId}-${record.type}-${record.key}`}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <CcEventIcon
                    eventId={record.eventId}
                    eventName={record.eventName}
                    className="text-lg"
                  />
                  <span>{record.eventName}</span>
                </div>
              </TableCell>
              <TableCell>
                {record.type === "single" ? "Single" : "Average"}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCcResult(record.eventFormat, record.value, record.type)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <CcCompetitors competitors={record.competitors} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Link
                  prefetch={false}
                  href={`/competitions/${record.competitionId}/results/unofficial?event=${record.eventId}`}
                  className="text-link hover:text-link/80"
                >
                  {record.competitionName}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {formatDate(record.date, record.date)}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
