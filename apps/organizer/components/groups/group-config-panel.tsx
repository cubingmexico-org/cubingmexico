"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import type { WCIF } from "@/types/wcif";
import {
  createGroupsForRound,
  findRoundActivities,
  getGroupActivitiesForRound,
  parseRoundActivityCode,
} from "@/lib/groups/wcif-schedule";
import {
  extensionSourceLabel,
  suggestGroupCountsFromExtensions,
} from "@/lib/groups/extensions";
import {
  getActivityConfig,
  getCompetitionConfig,
  getRoomConfig,
  hasOrganizacionActivityConfig,
  setRoundActivityConfigs,
  suggestedGroupsForRound,
} from "@/lib/groups/config";
import { suggestStaffForRound } from "@/lib/groups/formulas";
import { toast } from "sonner";

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function GroupConfigPanel({
  wcif,
  roundActivityCode,
  onApply,
}: {
  wcif: WCIF;
  roundActivityCode: string;
  onApply: (next: WCIF) => void;
}) {
  const parents = useMemo(
    () => findRoundActivities(wcif, roundActivityCode),
    [wcif, roundActivityCode],
  );
  const existingGroups = useMemo(
    () => getGroupActivitiesForRound(wcif, roundActivityCode),
    [wcif, roundActivityCode],
  );
  const roundMeta = useMemo(
    () => parseRoundActivityCode(roundActivityCode),
    [roundActivityCode],
  );
  const competitionConfig = useMemo(() => getCompetitionConfig(wcif), [wcif]);
  const roundSuggestion = useMemo(
    () => suggestedGroupsForRound(wcif, roundActivityCode),
    [wcif, roundActivityCode],
  );
  const primaryStations = useMemo(() => {
    const first = parents[0];
    if (!first) return 0;
    const room = wcif.schedule.venues
      .flatMap((v) => v.rooms)
      .find((r) => r.id === first.roomId);
    return room ? getRoomConfig(room).stations : 0;
  }, [wcif, parents]);

  const [spreadAcrossStages, setSpreadAcrossStages] = useState(true);
  const [groupCount, setGroupCount] = useState(2);
  const [perRoomCounts, setPerRoomCounts] = useState<Record<number, number>>(
    {},
  );
  const [timeSplit, setTimeSplit] = useState(true);
  const [scramblersEnabled, setScramblersEnabled] = useState(true);
  const [runnersEnabled, setRunnersEnabled] = useState(true);
  const [assignJudges, setAssignJudges] = useState(true);
  const [scramblerCount, setScramblerCount] = useState(1);
  const [runnerCount, setRunnerCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [extensionHint, setExtensionHint] = useState<string | null>(null);

  const effectiveGroups = spreadAcrossStages
    ? groupCount
    : Math.max(...Object.values(perRoomCounts), groupCount, 1);

  const staffHelpers = useMemo(
    () =>
      suggestStaffForRound({
        stations: primaryStations,
        competitors: Math.max(roundSuggestion.competitors, 1),
        roundNumber: roundMeta?.roundNumber ?? 1,
        groups: effectiveGroups,
        assignScramblers: scramblersEnabled,
        assignRunners: runnersEnabled,
        assignJudges,
      }),
    [
      primaryStations,
      roundSuggestion.competitors,
      roundMeta?.roundNumber,
      effectiveGroups,
      scramblersEnabled,
      runnersEnabled,
      assignJudges,
    ],
  );

  useEffect(() => {
    setError(null);
    const foreign = suggestGroupCountsFromExtensions(wcif, roundActivityCode);
    const suggestion = suggestedGroupsForRound(wcif, roundActivityCode);
    const firstParent = parents[0];
    const savedConfig = firstParent
      ? getActivityConfig(firstParent.activity)
      : null;
    const hasSaved = firstParent
      ? hasOrganizacionActivityConfig(firstParent.activity)
      : false;

    if (existingGroups.length > 0) {
      setGroupCount(Math.max(1, existingGroups.length));
      const initial: Record<number, number> = {};
      for (const parent of parents) {
        initial[parent.roomId] = parent.activity.childActivities?.length || 0;
      }
      setPerRoomCounts(initial);
      setExtensionHint(null);
    } else {
      setSpreadAcrossStages(suggestion.spreadAcrossStages);
      setGroupCount(Math.max(1, suggestion.groupCount));
      setPerRoomCounts({ ...suggestion.perRoomCounts });

      if (foreign) {
        setExtensionHint(
          `Detectado desde ${extensionSourceLabel(foreign.source)}`,
        );
      } else if (suggestion.stations > 0) {
        setExtensionHint(
          `Sugerido: ${suggestion.competitors} inscritos · ${suggestion.stations} estaciones → ${suggestion.groupCount} grupo(s)`,
        );
      } else {
        setExtensionHint(
          "Configura estaciones en Configuración para una mejor sugerencia",
        );
      }
    }

    const staffSeed = suggestStaffForRound({
      stations: primaryStations,
      competitors: Math.max(suggestion.competitors, 1),
      roundNumber: roundMeta?.roundNumber ?? 1,
      groups: hasSaved
        ? (savedConfig?.groups ?? suggestion.groupCount)
        : suggestion.groupCount,
      assignScramblers: competitionConfig.assignScramblers,
      assignRunners: competitionConfig.assignRunners,
      assignJudges: competitionConfig.assignJudges,
    });

    if (hasSaved && savedConfig) {
      setScramblersEnabled(savedConfig.scramblers > 0);
      setRunnersEnabled(savedConfig.runners > 0);
      setAssignJudges(savedConfig.assignJudges);
      setScramblerCount(savedConfig.scramblers);
      setRunnerCount(savedConfig.runners);
    } else {
      setScramblersEnabled(competitionConfig.assignScramblers);
      setRunnersEnabled(competitionConfig.assignRunners);
      setAssignJudges(competitionConfig.assignJudges);
      setScramblerCount(staffSeed.scramblers);
      setRunnerCount(staffSeed.runners);
    }
  }, [
    roundActivityCode,
    parents,
    existingGroups.length,
    wcif,
    primaryStations,
    roundMeta?.roundNumber,
    competitionConfig.assignScramblers,
    competitionConfig.assignRunners,
    competitionConfig.assignJudges,
  ]);

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

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="spread-stages">
            Misma cantidad en todos los escenarios
          </Label>
          <p className="text-xs text-muted-foreground">
            Si se desactiva, puedes definir conteo por sala
          </p>
        </div>
        <Switch
          id="spread-stages"
          checked={spreadAcrossStages}
          onCheckedChange={setSpreadAcrossStages}
        />
      </div>

      {spreadAcrossStages ? (
        <div className="space-y-2 max-w-xs">
          <Label htmlFor="group-count">Cantidad de grupos</Label>
          <Input
            id="group-count"
            type="number"
            min={1}
            max={32}
            value={groupCount}
            onChange={(e) => setGroupCount(Number(e.target.value) || 1)}
          />
          <p className="text-xs text-muted-foreground">
            {staffHelpers.peoplePerGroup} personas por grupo
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {parents.map((parent) => (
            <div
              key={parent.roomId}
              className="flex items-center gap-3 max-w-md"
            >
              <Label className="w-40 shrink-0 truncate" title={parent.roomName}>
                {parent.roomName}
              </Label>
              <Input
                type="number"
                min={0}
                max={32}
                value={perRoomCounts[parent.roomId] ?? 0}
                onChange={(e) =>
                  setPerRoomCounts((prev) => ({
                    ...prev,
                    [parent.roomId]: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          ))}
        </div>
      )}

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
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Grupo</th>
                <th className="px-3 py-2 font-medium">Sala</th>
                <th className="px-3 py-2 font-medium">Horario</th>
              </tr>
            </thead>
            <tbody>
              {existingGroups.map((group) => (
                <tr key={group.activity.id} className="border-t">
                  <td className="px-3 py-2">{group.activity.name}</td>
                  <td className="px-3 py-2">{group.roomName}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatTime(group.activity.startTime)} –{" "}
                    {formatTime(group.activity.endTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StaffField({
  id,
  label,
  enabled,
  onEnabledChange,
  count,
  onCountChange,
  helper,
}: {
  id: string;
  label: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  count: number;
  onCountChange: (count: number) => void;
  helper?: string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <Checkbox
        id={id}
        checked={enabled}
        onCheckedChange={(value) => onEnabledChange(value === true)}
        className="mt-2.5"
      />
      <div className="space-y-1 min-w-0 flex-1">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
      <Input
        type="number"
        min={0}
        max={32}
        className="w-20"
        disabled={!enabled}
        value={count}
        onChange={(e) => onCountChange(Number(e.target.value) || 0)}
        aria-label={`Cantidad de ${label.toLowerCase()}`}
      />
    </div>
  );
}
