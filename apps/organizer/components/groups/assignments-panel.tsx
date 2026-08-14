"use client";

import { useMemo, useState } from "react";
import { Download, Eraser, Shuffle, Hash, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import type { Assignment, EventId, Person, WCIF } from "@/types/wcif";
import { detectConflicts } from "@/lib/groups/conflicts";
import {
  generateAssignmentsForRound,
  removePersonAssignment,
  setPersonAssignment,
} from "@/lib/groups/generate-assignments";
import { exportAssignmentsCsv, exportDraftJson } from "@/lib/groups/export";
import {
  assignStationsForRound,
  clearStationsForRound,
} from "@/lib/groups/stations";
import {
  clearGroupAssignments,
  clearRoundAssignments,
  getGroupActivitiesForRound,
  parseGroupNumber,
} from "@/lib/groups/wcif-schedule";

const ASSIGNMENT_CODES = [
  { value: "competitor", label: "Competidor" },
  { value: "staff-judge", label: "Juez" },
  { value: "staff-scrambler", label: "Mezclador" },
  { value: "staff-runner", label: "Corredor" },
] as const;

function codeLabel(code: string): string {
  return ASSIGNMENT_CODES.find((c) => c.value === code)?.label ?? code;
}

type Row = {
  person: Person;
  assignment: Assignment;
  groupNumber: number | null;
  roomName: string;
  activityName: string;
};

export function AssignmentsPanel({
  wcif,
  roundActivityCode,
  competitionId,
  onApply,
}: {
  wcif: WCIF;
  roundActivityCode: string;
  competitionId: string;
  onApply: (next: WCIF) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [manualPersonId, setManualPersonId] = useState<string>("");
  const [manualActivityId, setManualActivityId] = useState<string>("");
  const [manualCode, setManualCode] = useState<string>("competitor");

  const groups = useMemo(
    () => getGroupActivitiesForRound(wcif, roundActivityCode),
    [wcif, roundActivityCode],
  );
  const groupIds = useMemo(
    () => new Set(groups.map((g) => g.activity.id)),
    [groups],
  );
  const groupById = useMemo(() => {
    const map = new Map(groups.map((g) => [g.activity.id, g]));
    return map;
  }, [groups]);

  const eventId = roundActivityCode.replace(/-r\d+$/, "") as EventId;

  const conflicts = useMemo(
    () => detectConflicts(wcif, roundActivityCode),
    [wcif, roundActivityCode],
  );

  const rows: Row[] = useMemo(() => {
    const list: Row[] = [];
    for (const person of wcif.persons) {
      for (const assignment of person.assignments ?? []) {
        const group = groupById.get(assignment.activityId);
        if (!group) continue;
        list.push({
          person,
          assignment,
          groupNumber: parseGroupNumber(group.activity.activityCode),
          roomName: group.roomName,
          activityName: group.activity.name,
        });
      }
    }
    return list.sort((a, b) => {
      const g = (a.groupNumber ?? 0) - (b.groupNumber ?? 0);
      if (g !== 0) return g;
      if (a.assignment.assignmentCode !== b.assignment.assignmentCode) {
        return a.assignment.assignmentCode.localeCompare(
          b.assignment.assignmentCode,
        );
      }
      return a.person.name.localeCompare(b.person.name, "es");
    });
  }, [wcif.persons, groupById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filterGroup !== "all" && String(row.groupNumber) !== filterGroup) {
        return false;
      }
      if (!q) return true;
      return (
        row.person.name.toLowerCase().includes(q) ||
        (row.person.wcaId?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, filterGroup]);

  const competingPeople = useMemo(
    () =>
      wcif.persons
        .filter(
          (p) =>
            p.registration?.isCompeting &&
            (p.registration.eventIds ?? []).includes(eventId),
        )
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [wcif.persons, eventId],
  );

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Crea grupos para esta ronda antes de generar o editar asignaciones.
      </p>
    );
  }

  const run = (fn: () => WCIF, successMessage?: string) => {
    setError(null);
    try {
      onApply(fn());
      if (successMessage) toast.success(successMessage);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al actualizar";
      setError(message);
      toast.error(message);
    }
  };

  const handleManualAssign = () => {
    if (!manualPersonId || !manualActivityId) {
      toast.error("Selecciona persona y grupo");
      return;
    }
    const activityId = Number(manualActivityId);
    run(
      () =>
        setPersonAssignment(
          wcif,
          { wcaUserId: Number(manualPersonId) },
          {
            activityId,
            stationNumber: null,
            assignmentCode: manualCode,
          },
          groupIds,
        ),
      "Asignación manual aplicada",
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() =>
            run(
              () => generateAssignmentsForRound(wcif, roundActivityCode),
              "Asignaciones generadas para esta ronda",
            )
          }
        >
          <Shuffle className="size-4" />
          Generar asignaciones
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            run(
              () => assignStationsForRound(wcif, roundActivityCode),
              "Estaciones asignadas",
            )
          }
        >
          <Hash className="size-4" />
          Asignar estaciones
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            run(
              () => clearStationsForRound(wcif, roundActivityCode),
              "Estaciones limpiadas",
            )
          }
        >
          Limpiar estaciones
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            run(
              () => clearRoundAssignments(wcif, roundActivityCode),
              "Asignaciones de la ronda reiniciadas",
            )
          }
        >
          <Eraser className="size-4" />
          Reiniciar ronda
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            exportAssignmentsCsv(wcif, roundActivityCode, competitionId);
            toast.success("CSV exportado");
          }}
          disabled={rows.length === 0}
        >
          <Download className="size-4" />
          CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            exportDraftJson(wcif, competitionId);
            toast.success("JSON exportado");
          }}
        >
          <Download className="size-4" />
          JSON
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Conflictos ({conflicts.length})</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {conflicts.slice(0, 12).map((c, i) => (
                <li key={`${c.type}-${i}`}>{c.message}</li>
              ))}
              {conflicts.length > 12 && <li>…y {conflicts.length - 12} más</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Asignación manual</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label>Persona</Label>
            <Select value={manualPersonId} onValueChange={setManualPersonId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {competingPeople.map((p) => (
                  <SelectItem key={p.wcaUserId} value={String(p.wcaUserId)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Grupo</Label>
            <Select
              value={manualActivityId}
              onValueChange={setManualActivityId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.activity.id} value={String(g.activity.id)}>
                    G{parseGroupNumber(g.activity.activityCode)} · {g.roomName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Rol</Label>
            <Select value={manualCode} onValueChange={setManualCode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_CODES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              className="w-full"
              onClick={handleManualAssign}
            >
              Asignar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1 grow max-w-sm">
          <Label htmlFor="assign-search">Buscar</Label>
          <Input
            id="assign-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o WCA ID"
          />
        </div>
        <div className="space-y-1 w-40">
          <Label>Filtrar grupo</Label>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {groups.map((g) => {
                const n = parseGroupNumber(g.activity.activityCode);
                return (
                  <SelectItem key={g.activity.id} value={String(n)}>
                    Grupo {n}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

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
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  Sin asignaciones
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
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
                        onClick={() =>
                          run(() =>
                            removePersonAssignment(
                              wcif,
                              { wcaUserId: row.person.wcaUserId },
                              row.assignment.activityId,
                              row.assignment.assignmentCode,
                            ),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Vaciar este grupo"
                        onClick={() =>
                          run(() =>
                            clearGroupAssignments(
                              wcif,
                              row.assignment.activityId,
                            ),
                          )
                        }
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
    </div>
  );
}
