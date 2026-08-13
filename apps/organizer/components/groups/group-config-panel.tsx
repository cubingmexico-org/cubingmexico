"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import type { WCIF } from "@/types/wcif";
import {
  createGroupsForRound,
  findRoundActivities,
  getGroupActivitiesForRound,
} from "@/lib/groups/wcif-schedule";
import {
  extensionSourceLabel,
  suggestGroupCountsFromExtensions,
} from "@/lib/groups/extensions";

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

  const [spreadAcrossStages, setSpreadAcrossStages] = useState(true);
  const [groupCount, setGroupCount] = useState(2);
  const [perRoomCounts, setPerRoomCounts] = useState<Record<number, number>>(
    {},
  );
  const [timeSplit, setTimeSplit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extensionHint, setExtensionHint] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const suggestion = suggestGroupCountsFromExtensions(wcif, roundActivityCode);

    if (existingGroups.length > 0) {
      setGroupCount(Math.max(1, existingGroups.length));
      const initial: Record<number, number> = {};
      for (const parent of parents) {
        initial[parent.roomId] = parent.activity.childActivities?.length || 0;
      }
      setPerRoomCounts(initial);
      setExtensionHint(null);
      return;
    }

    if (suggestion) {
      setSpreadAcrossStages(suggestion.spreadAcrossStages);
      if (suggestion.groupCount != null) {
        setGroupCount(Math.max(1, suggestion.groupCount));
      }
      if (suggestion.perRoomCounts) {
        setPerRoomCounts({ ...suggestion.perRoomCounts });
      } else {
        const initial: Record<number, number> = {};
        for (const parent of parents) {
          initial[parent.roomId] = suggestion.groupCount ?? 2;
        }
        setPerRoomCounts(initial);
      }
      setExtensionHint(
        `Detectado desde ${extensionSourceLabel(suggestion.source)}`,
      );
      return;
    }

    setGroupCount(2);
    const initial: Record<number, number> = {};
    for (const parent of parents) {
      initial[parent.roomId] = 2;
    }
    setPerRoomCounts(initial);
    setExtensionHint(null);
  }, [roundActivityCode, parents, existingGroups.length, wcif]);

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

  const handleCreate = () => {
    setError(null);
    try {
      const next = createGroupsForRound(wcif, roundActivityCode, {
        spreadAcrossStages,
        groupCount: Math.max(1, groupCount),
        perRoomCounts,
        timeSplit,
      });
      onApply(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron crear grupos");
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
          <Label htmlFor="spread-stages">Misma cantidad en todos los escenarios</Label>
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
        </div>
      ) : (
        <div className="space-y-3">
          {parents.map((parent) => (
            <div key={parent.roomId} className="flex items-center gap-3 max-w-md">
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

      <Button type="button" onClick={handleCreate}>
        {existingGroups.length > 0 ? "Reemplazar grupos" : "Crear grupos"}
      </Button>

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
