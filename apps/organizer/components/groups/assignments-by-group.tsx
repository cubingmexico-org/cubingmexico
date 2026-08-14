"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import type { WCIF } from "@/types/wcif";
import {
  buildAssignmentsByGroup,
  codeLabel,
  findUnmatchedActivityIds,
} from "@/lib/groups/day-of";

export function AssignmentsByGroup({
  wcif,
  roundActivityCode,
  onSelectPerson,
}: {
  wcif: WCIF;
  roundActivityCode: string;
  onSelectPerson: (wcaUserId: number) => void;
}) {
  const rows = useMemo(
    () => buildAssignmentsByGroup(wcif, roundActivityCode),
    [wcif, roundActivityCode],
  );
  const unmatched = useMemo(() => findUnmatchedActivityIds(wcif), [wcif]);
  const orphans = rows.filter((r) => r.orphan);

  return (
    <div className="space-y-4">
      {unmatched.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>IDs de actividad desconocidos</AlertTitle>
          <AlertDescription>
            Asignaciones apuntan a actividades que no están en el horario:{" "}
            {unmatched.join(", ")}
          </AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-muted-foreground">
        {rows.length} asignación{rows.length === 1 ? "" : "es"}
        {orphans.length > 0
          ? ` · ${orphans.length} huérfana${orphans.length === 1 ? "" : "s"}`
          : ""}
      </p>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grupo</TableHead>
              <TableHead>Sala</TableHead>
              <TableHead>Persona</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  Sin asignaciones en esta ronda
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={`${row.wcaUserId}-${row.activityId}-${row.assignmentCode}`}
                  className={row.orphan ? "bg-destructive/5" : undefined}
                >
                  <TableCell>
                    {row.orphan ? (
                      <Badge variant="destructive">Huérfana</Badge>
                    ) : (
                      <Badge variant="secondary">
                        G{row.groupNumber ?? "?"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{row.roomName}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="font-medium text-left underline-offset-2 hover:underline"
                      onClick={() => onSelectPerson(row.wcaUserId)}
                    >
                      {row.personName}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {row.wcaId ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell>{codeLabel(row.assignmentCode)}</TableCell>
                  <TableCell className="tabular-nums">
                    {row.stationNumber ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
