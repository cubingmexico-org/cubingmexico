import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { GroupKind } from "@workspace/db/schema";
import { formatAttemptValue } from "@/lib/utils";
import { groupRecordLabel } from "@/lib/groups";
import {
  getGroupCurrentRecords,
  getGroupHistoricalRecordCount,
  getGroupInfo,
} from "../_lib/queries";

export async function GroupRecords({
  groupId,
  kind,
}: {
  groupId: string;
  kind: GroupKind;
}) {
  const [info, records, historicalCount] = await Promise.all([
    getGroupInfo(groupId),
    getGroupCurrentRecords(groupId),
    getGroupHistoricalRecordCount(groupId),
  ]);

  if (!info || info.kind !== kind) {
    return null;
  }

  const recordLabel = groupRecordLabel(kind);
  const title = recordLabel ? `Récords (${recordLabel})` : "Récords";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Mejores marcas actuales del grupo (rank 1 por evento).
        </p>
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay récords calculados para este grupo.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Persona</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow
                  key={`${record.eventId}-${record.type}-${record.personId}`}
                >
                  <TableCell>{record.eventName}</TableCell>
                  <TableCell>
                    {record.type === "single" ? "Single" : "Average"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/persons/${record.personId}`}
                      prefetch={false}
                      className="hover:underline"
                    >
                      {record.personName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatAttemptValue(
                      record.eventId,
                      record.best,
                      record.type,
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {historicalCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {historicalCount} marcadores históricos
          {recordLabel ? ` ${recordLabel}` : ""} en resultados.
        </p>
      ) : null}
    </div>
  );
}
