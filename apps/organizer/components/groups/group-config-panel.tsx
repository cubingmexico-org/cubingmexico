"use client";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import type { WCIF } from "@/types/wcif";
import { createGroupsForRound } from "@/lib/groups/wcif-schedule";
import { setRoundActivityConfigs } from "@/lib/groups/config";
import { toast } from "sonner";
import { ExistingGroupsTable } from "./existing-groups-table";
import { GroupCountFields } from "./group-count-fields";
import { StaffField } from "./staff-field";
import { useGroupConfigState } from "./use-group-config-state";

export function GroupConfigPanel({
  wcif,
  roundActivityCode,
  onApply,
}: {
  wcif: WCIF;
  roundActivityCode: string;
  onApply: (next: WCIF) => void;
}) {
  const {
    parents,
    existingGroups,
    staffHelpers,
    extensionHint,
    error,
    setError,
    spreadAcrossStages,
    setSpreadAcrossStages,
    groupCount,
    setGroupCount,
    perRoomCounts,
    setPerRoomCounts,
    timeSplit,
    setTimeSplit,
    scramblersEnabled,
    setScramblersEnabled,
    runnersEnabled,
    setRunnersEnabled,
    assignJudges,
    setAssignJudges,
    scramblerCount,
    setScramblerCount,
    runnerCount,
    setRunnerCount,
  } = useGroupConfigState(wcif, roundActivityCode);

  if (parents.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 text-sm">
        No hay actividades programadas para{" "}
        <code className="font-mono text-xs">{roundActivityCode}</code> en el
        horario. Agrega la ronda al schedule en el sitio WCA antes de crear
        grupos.
      </div>
    );
  }

  const persistStaffConfig = (source: WCIF) => {
    const groupsByRoom = spreadAcrossStages
      ? Object.fromEntries(
          parents.map((p) => [p.roomId, Math.max(1, groupCount)]),
        )
      : perRoomCounts;

    return setRoundActivityConfigs(
      source,
      roundActivityCode,
      ({ groups, parentCount }) => ({
        capacity: 1 / parentCount,
        groups,
        scramblers: scramblersEnabled ? Math.max(0, scramblerCount) : 0,
        runners: runnersEnabled ? Math.max(0, runnerCount) : 0,
        assignJudges,
      }),
      groupsByRoom,
    );
  };

  const handleCreate = () => {
    setError(null);
    try {
      let next = persistStaffConfig(wcif);
      next = createGroupsForRound(next, roundActivityCode, {
        spreadAcrossStages,
        groupCount: Math.max(1, groupCount),
        perRoomCounts,
        timeSplit,
      });
      onApply(next);
      toast.success(
        existingGroups.length > 0 ? "Grupos reemplazados" : "Grupos creados",
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "No se pudieron crear grupos";
      setError(message);
      toast.error(message);
    }
  };

  const handleSaveStaff = () => {
    setError(null);
    try {
      onApply(persistStaffConfig(wcif));
      toast.success("Configuración de voluntarios guardada");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "No se pudo guardar la configuración";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-semibold">Configurar grupos</h3>
        <p className="text-sm text-muted-foreground">
          {parents.length} escenario{parents.length === 1 ? "" : "s"} ·{" "}
          {existingGroups.length} grupo
          {existingGroups.length === 1 ? "" : "s"} actual
          {existingGroups.length === 1 ? "" : "es"}
        </p>
        {extensionHint && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {extensionHint}
          </p>
        )}
      </div>

      <GroupCountFields
        parents={parents}
        spreadAcrossStages={spreadAcrossStages}
        onSpreadAcrossStagesChange={setSpreadAcrossStages}
        groupCount={groupCount}
        onGroupCountChange={setGroupCount}
        perRoomCounts={perRoomCounts}
        onPerRoomCountsChange={setPerRoomCounts}
        peoplePerGroup={staffHelpers.peoplePerGroup}
      />

      <div className="space-y-3 rounded-md border p-3">
        <h4 className="text-sm font-medium">Voluntarios por grupo</h4>
        <StaffField
          id="round-scramblers"
          label="Mezcladores"
          enabled={scramblersEnabled}
          onEnabledChange={setScramblersEnabled}
          count={scramblerCount}
          onCountChange={setScramblerCount}
          helper={
            scramblersEnabled && scramblerCount > 0
              ? `${staffHelpers.cubesPerScrambler} cubos por mezclador`
              : undefined
          }
        />
        <StaffField
          id="round-runners"
          label="Corredores"
          enabled={runnersEnabled}
          onEnabledChange={setRunnersEnabled}
          count={runnerCount}
          onCountChange={setRunnerCount}
          helper={
            runnersEnabled && runnerCount > 0
              ? `${staffHelpers.stationsPerRunner} estaciones por corredor`
              : undefined
          }
        />
        <div className="flex items-center gap-3">
          <Checkbox
            id="round-judges"
            checked={assignJudges}
            onCheckedChange={(checked) => setAssignJudges(checked === true)}
          />
          <Label htmlFor="round-judges" className="cursor-pointer">
            Asignar jueces
            {assignJudges && staffHelpers.judges > 0 && (
              <span className="block text-xs text-muted-foreground font-normal">
                Hasta {staffHelpers.judges} juez
                {staffHelpers.judges === 1 ? "" : "es"} por grupo
              </span>
            )}
          </Label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="time-split">Dividir horario entre grupos</Label>
          <p className="text-xs text-muted-foreground">
            Reparte el intervalo de la ronda de forma uniforme
          </p>
        </div>
        <Switch
          id="time-split"
          checked={timeSplit}
          onCheckedChange={setTimeSplit}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleCreate}>
          {existingGroups.length > 0 ? "Reemplazar grupos" : "Crear grupos"}
        </Button>
        {existingGroups.length > 0 && (
          <Button type="button" variant="outline" onClick={handleSaveStaff}>
            Guardar voluntarios
          </Button>
        )}
      </div>

      {existingGroups.length > 0 && (
        <ExistingGroupsTable groups={existingGroups} />
      )}
    </div>
  );
}
