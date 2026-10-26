"use client";

import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type {
  CompetitionConfig,
  CompetitorsSortingRule,
} from "@/lib/groups/config";
import { ConfigSwitch, type UpdateCompetitionConfig } from "./config-controls";

const SORTING_RULES: {
  id: CompetitorsSortingRule;
  name: string;
  description: string;
}[] = [
  {
    id: "ranks",
    name: "Rankings oficiales",
    description: "Ordena por rankings oficiales.",
  },
  {
    id: "balanced",
    name: "Balanceado",
    description:
      "Rankings en 3x3 (variantes), 2x2, Pyraminx, Skewb, Square-1 y Clock; en el resto reparte a los mejores entre grupos.",
  },
  {
    id: "symmetric",
    name: "Simétrico",
    description:
      "Reparte a los mejores entre grupos para tener buenos mezcladores en cada uno.",
  },
  {
    id: "name-optimised",
    name: "Optimizado por nombre",
    description:
      "Rankings oficiales minimizando nombres iguales en el mismo grupo.",
  },
];

export function AssignmentRulesSection({
  config,
  updateConfig,
}: {
  config: CompetitionConfig;
  updateConfig: UpdateCompetitionConfig;
}) {
  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-semibold">Asignaciones</h3>
        <p className="text-sm text-muted-foreground">
          Reglas al generar grupos y tareas de voluntarios.
        </p>
      </div>

      <div className="space-y-2 max-w-md">
        <Label>Orden de competidores</Label>
        <Select
          value={config.competitorsSortingRule}
          onValueChange={(v) =>
            updateConfig({
              competitorsSortingRule: v as CompetitorsSortingRule,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTING_RULES.map((rule) => (
              <SelectItem key={rule.id} value={rule.id}>
                {rule.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {
            SORTING_RULES.find((r) => r.id === config.competitorsSortingRule)
              ?.description
          }{" "}
          Solo aplica a primeras rondas.
        </p>
      </div>

      <ConfigSwitch
        id="no-newcomers"
        label="No asignar tareas a nuevos"
        checked={config.noTasksForNewcomers}
        onCheckedChange={(checked) =>
          updateConfig({ noTasksForNewcomers: checked })
        }
      />
      <ConfigSwitch
        id="own-events"
        label="Asignar tareas solo en eventos en los que están inscritos"
        checked={config.tasksForOwnEventsOnly}
        onCheckedChange={(checked) =>
          updateConfig({ tasksForOwnEventsOnly: checked })
        }
      />
      <ConfigSwitch
        id="no-foreign-running"
        label="No asignar corredor a extranjeros"
        checked={config.noRunningForForeigners}
        onCheckedChange={(checked) =>
          updateConfig({ noRunningForForeigners: checked })
        }
      />
    </section>
  );
}
