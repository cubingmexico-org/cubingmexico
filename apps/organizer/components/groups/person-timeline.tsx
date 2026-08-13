"use client";

import { useMemo, useState } from "react";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import type { WCIF } from "@/types/wcif";
import {
  buildPersonTimeline,
  codeLabel,
  personsWithAssignments,
} from "@/lib/groups/day-of";

function formatTime(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PersonTimeline({
  wcif,
  selectedWcaUserId,
  onSelectPerson,
}: {
  wcif: WCIF;
  selectedWcaUserId: number | null;
  onSelectPerson: (wcaUserId: number | null) => void;
}) {
  const people = useMemo(() => personsWithAssignments(wcif), [wcif]);
  const [localId, setLocalId] = useState<string>(
    selectedWcaUserId != null ? String(selectedWcaUserId) : "",
  );

  const activeId = selectedWcaUserId ?? (localId ? Number(localId) : null);

  const rows = useMemo(
    () => (activeId != null ? buildPersonTimeline(wcif, activeId) : []),
    [wcif, activeId],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-w-sm">
        <Label>Persona</Label>
        <Select
          value={activeId != null ? String(activeId) : undefined}
          onValueChange={(value) => {
            setLocalId(value);
            onSelectPerson(Number(value));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar persona" />
          </SelectTrigger>
          <SelectContent>
            {people.map((p) => (
              <SelectItem key={p.wcaUserId} value={String(p.wcaUserId)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeId == null ? (
        <p className="text-sm text-muted-foreground">
          Elige una persona para ver su línea de tiempo de asignaciones.
        </p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inicio</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead>Sala</TableHead>
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
                    Sin asignaciones
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={`${row.activityId}-${row.assignmentCode}`}
                    className={row.orphan ? "bg-destructive/5" : undefined}
                  >
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {formatTime(row.startTime)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.activityName}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {row.activityCode}
                        {row.groupNumber != null ? ` · G${row.groupNumber}` : ""}
                      </div>
                      {row.orphan && (
                        <Badge variant="destructive" className="mt-1">
                          Huérfana
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{row.roomName}</TableCell>
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
      )}
    </div>
  );
}
