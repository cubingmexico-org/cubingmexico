"use client";

import { useMemo, useState } from "react";
import { Download, Eraser, Shuffle, Hash } from "lucide-react";
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import type { EventId, WCIF } from "@/types/wcif";
import { detectConflicts } from "@/lib/groups/conflicts";
import { generateAssignmentsForRound } from "@/lib/groups/generate-assignments";
import {
  removePersonAssignment,
  setPersonAssignment,
} from "@/lib/groups/manual-assignments";
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
import { assignmentRows, filterAssignmentRows } from "./assignment-rows";
import { AssignmentsTable } from "./assignments-table";
import { ManualAssignmentForm } from "./manual-assignment-form";

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

  const groups = useMemo(
    () => getGroupActivitiesForRound(wcif, roundActivityCode),
    [wcif, roundActivityCode],
  );
  const groupIds = useMemo(
    () => new Set(groups.map((g) => g.activity.id)),
    [groups],
  );
  const eventId = roundActivityCode.replace(/-r\d+$/, "") as EventId;

  const conflicts = useMemo(
    () => detectConflicts(wcif, roundActivityCode),
    [wcif, roundActivityCode],
  );

  const rows = useMemo(
    () => assignmentRows(wcif.persons, groups),
    [wcif.persons, groups],
  );

  const filtered = useMemo(
    () => filterAssignmentRows(rows, search, filterGroup),
    [rows, search, filterGroup],
  );

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

  const handleManualAssign = ({
    wcaUserId,
    activityId,
    assignmentCode,
  }: {
    wcaUserId: number;
    activityId: number;
    assignmentCode: string;
  }) =>
    run(
      () =>
        setPersonAssignment(
          wcif,
          { wcaUserId },
          { activityId, stationNumber: null, assignmentCode },
          groupIds,
        ),
      "Asignación manual aplicada",
    );

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

      <ManualAssignmentForm
        people={competingPeople}
        groups={groups}
        onAssign={handleManualAssign}
      />

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
          <Label htmlFor="assign-filter-group">Filtrar grupo</Label>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger id="assign-filter-group">
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

      <AssignmentsTable
        rows={filtered}
        onRemove={(row) =>
          run(() =>
            removePersonAssignment(
              wcif,
              { wcaUserId: row.person.wcaUserId },
              row.assignment.activityId,
              row.assignment.assignmentCode,
            ),
          )
        }
        onClearGroup={(activityId) =>
          run(() => clearGroupAssignments(wcif, activityId))
        }
      />
    </div>
  );
}
