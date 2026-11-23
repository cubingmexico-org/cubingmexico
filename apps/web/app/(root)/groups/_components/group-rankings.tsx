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
import { groupBasePath, groupRecordLabel } from "@/lib/groups";
import { getGroupInfo, getGroupRanks } from "../_lib/queries";

export async function GroupRankings({
  groupId,
  kind,
  eventId,
  rankType,
}: {
  groupId: string;
  kind: GroupKind;
  eventId: string;
  rankType: "single" | "average";
}) {
  const [info, ranks] = await Promise.all([
    getGroupInfo(groupId),
    getGroupRanks(groupId, eventId, rankType),
  ]);

  if (!info || info.kind !== kind) {
    return null;
  }

  const base = `${groupBasePath(kind)}/${groupId}/rankings`;
  const label = groupRecordLabel(kind);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Rankings {rankType === "single" ? "single" : "average"} · {eventId}
          </h2>
          <p className="text-sm text-muted-foreground">
            Clasificación interna del grupo (columna {label} = rank 1).
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href={`${base}/${eventId}/single`}
            className={
              rankType === "single"
                ? "font-semibold text-brand"
                : "text-muted-foreground hover:underline"
            }
          >
            Single
          </Link>
          <Link
            href={`${base}/${eventId}/average`}
            className={
              rankType === "average"
                ? "font-semibold text-brand"
                : "text-muted-foreground hover:underline"
            }
          >
            Average
          </Link>
          <Link
            href={`/rankings/${eventId}/${rankType}`}
            className="text-muted-foreground hover:underline"
          >
            Rankings nacionales
          </Link>
        </div>
      </div>

      {ranks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay rankings calculados todavía. Se actualizan tras importar
          resultados o editar el roster.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranks.map((row) => (
                <TableRow key={row.personId}>
                  <TableCell>{row.groupRank}</TableCell>
                  <TableCell>
                    <Link
                      href={`/persons/${row.personId}`}
                      className="hover:underline"
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell>{row.state ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatAttemptValue(eventId, row.best, rankType)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
