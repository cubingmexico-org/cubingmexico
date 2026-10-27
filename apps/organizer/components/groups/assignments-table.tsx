import { Eraser, Trash2 } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { type AssignmentRow, codeLabel } from "./assignment-rows";

export function AssignmentsTable({
  rows,
  onRemove,
  onClearGroup,
}: {
  rows: AssignmentRow[];
  onRemove: (row: AssignmentRow) => void;
  onClearGroup: (activityId: number) => void;
}) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Sala</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estación</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground"
              >
                Sin asignaciones
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={`${row.person.wcaUserId}-${row.assignment.activityId}-${row.assignment.assignmentCode}`}
              >
                <TableCell>
                  <div className="font-medium">{row.person.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.person.wcaId ?? "—"}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">G{row.groupNumber}</Badge>
                </TableCell>
                <TableCell>{row.roomName}</TableCell>
                <TableCell>
                  {codeLabel(row.assignment.assignmentCode)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {row.assignment.stationNumber ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Quitar asignación"
                      onClick={() => onRemove(row)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Vaciar este grupo"
                      onClick={() => onClearGroup(row.assignment.activityId)}
                    >
                      <Eraser className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
