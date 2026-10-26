"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import type { WCIF } from "@/types/wcif";
import type { CompetitionConfig } from "@/lib/groups/config";
import {
  populateActivityConfigsForAllRounds,
  suggestInitialStaffPreview,
} from "@/lib/groups/config-suggestions";
import { suggestStaffForRound } from "@/lib/groups/formulas";
import { StaffRoleRow, type UpdateCompetitionConfig } from "./config-controls";

export function StaffConfigSection({
  wcif,
  config,
  updateConfig,
  onApply,
}: {
  wcif: WCIF;
  config: CompetitionConfig;
  updateConfig: UpdateCompetitionConfig;
  onApply: (next: WCIF) => void;
}) {
  const staffPreview = useMemo(() => suggestInitialStaffPreview(wcif), [wcif]);
  const [scramblerCount, setScramblerCount] = useState(staffPreview.scramblers);
  const [runnerCount, setRunnerCount] = useState(staffPreview.runners);

  const liveStaffHelpers = useMemo(() => {
    const suggestion = suggestStaffForRound({
      stations: staffPreview.stations,
      competitors: Math.max(staffPreview.competitors, 1),
      roundNumber: 1,
      groups: staffPreview.groups,
      assignScramblers: config.assignScramblers,
      assignRunners: config.assignRunners,
      assignJudges: config.assignJudges,
    });
    return {
      cubesPerScrambler:
        config.assignScramblers && scramblerCount > 0
          ? Math.round((suggestion.stationsInUse / scramblerCount) * 10) / 10
          : 0,
      stationsPerRunner:
        config.assignRunners && runnerCount > 0
          ? Math.round((suggestion.stationsInUse / runnerCount) * 10) / 10
          : 0,
    };
  }, [
    staffPreview,
    config.assignScramblers,
    config.assignRunners,
    config.assignJudges,
    scramblerCount,
    runnerCount,
  ]);

  useEffect(() => {
    setScramblerCount(staffPreview.scramblers);
    setRunnerCount(staffPreview.runners);
  }, [staffPreview.scramblers, staffPreview.runners]);

  const applyInitialStaffConfig = () => {
    const { wcif: next, roundCount } = populateActivityConfigsForAllRounds(
      wcif,
      {
        force: true,
        assignScramblers: config.assignScramblers,
        assignRunners: config.assignRunners,
        assignJudges: config.assignJudges,
        scramblers: config.assignScramblers ? scramblerCount : 0,
        runners: config.assignRunners ? runnerCount : 0,
      },
    );
    onApply(next);
    if (roundCount === 0) {
      toast.message("No hay rondas programadas en el horario WCIF");
    } else {
      toast.success(
        `Configuración aplicada a ${roundCount} ronda${roundCount === 1 ? "" : "s"}`,
      );
    }
  };

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-semibold">Configuración inicial de voluntarios</h3>
        <p className="text-sm text-muted-foreground">
          ¿Qué roles quieres asignar al generar grupos? Los números se calculan
          según estaciones e inscritos
          {staffPreview.competitors > 0
            ? ` (~${staffPreview.competitors} en el evento más grande, ${staffPreview.stations} estaciones)`
            : ""}
          . Sugerido: {staffPreview.groups} grupo
          {staffPreview.groups === 1 ? "" : "s"} · {staffPreview.peoplePerGroup}{" "}
          personas por grupo.
        </p>
      </div>

      <div className="space-y-3 max-w-lg">
        <StaffRoleRow
          id="assign-scramblers"
          label="Mezcladores"
          checked={config.assignScramblers}
          onCheckedChange={(checked) =>
            updateConfig({ assignScramblers: checked })
          }
          count={scramblerCount}
          onCountChange={setScramblerCount}
          helper={
            config.assignScramblers && scramblerCount > 0
              ? `${liveStaffHelpers.cubesPerScrambler} cubos por mezclador`
              : undefined
          }
        />
        <StaffRoleRow
          id="assign-runners"
          label="Corredores"
          checked={config.assignRunners}
          onCheckedChange={(checked) =>
            updateConfig({ assignRunners: checked })
          }
          count={runnerCount}
          onCountChange={setRunnerCount}
          helper={
            config.assignRunners && runnerCount > 0
              ? `${liveStaffHelpers.stationsPerRunner} estaciones por corredor`
              : undefined
          }
        />
        <div className="flex items-center gap-3">
          <Checkbox
            id="assign-judges"
            checked={config.assignJudges}
            onCheckedChange={(checked) =>
              updateConfig({ assignJudges: checked === true })
            }
          />
          <Label htmlFor="assign-judges" className="cursor-pointer">
            Asignar jueces
            {config.assignJudges && staffPreview.judges > 0 && (
              <span className="block text-xs text-muted-foreground font-normal">
                Hasta {staffPreview.judges} juez
                {staffPreview.judges === 1 ? "" : "es"} por grupo
              </span>
            )}
          </Label>
        </div>
      </div>

      <Button type="button" variant="outline" onClick={applyInitialStaffConfig}>
        Aplicar a todas las rondas
      </Button>
    </section>
  );
}
