"use client";

import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import type {
  CompetitionConfig,
  ScorecardDensity,
  ScorecardOrder,
  ScorecardPaperSize,
} from "@/lib/groups/config";
import { ConfigSwitch, type UpdateCompetitionConfig } from "./config-controls";
import { ScorecardBackgroundField } from "./scorecard-background-field";

export function PrintingConfigSection({
  config,
  updateConfig,
  competitionImageUrl,
}: {
  config: CompetitionConfig;
  updateConfig: UpdateCompetitionConfig;
  competitionImageUrl?: string | null;
}) {
  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-semibold">Impresión</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="scorecard-paper-size">Tamaño de papeleta</Label>
          <Select
            value={config.scorecardPaperSize}
            onValueChange={(v) =>
              updateConfig({ scorecardPaperSize: v as ScorecardPaperSize })
            }
          >
            <SelectTrigger id="scorecard-paper-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">Cuatro por página (A4)</SelectItem>
              <SelectItem value="letter">Cuatro por página (Letter)</SelectItem>
              <SelectItem value="a6">Una por página (A6)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="scorecard-density">Densidad</Label>
          <Select
            value={config.scorecardDensity}
            onValueChange={(v) =>
              updateConfig({ scorecardDensity: v as ScorecardDensity })
            }
            disabled={config.scorecardPaperSize === "a6"}
          >
            <SelectTrigger id="scorecard-density">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compacta (4 por página)</SelectItem>
              <SelectItem value="comfortable">
                Cómoda (2 por página, más espacio)
              </SelectItem>
            </SelectContent>
          </Select>
          {config.scorecardPaperSize === "a6" && (
            <p className="text-xs text-muted-foreground">
              A6 siempre es una papeleta por página.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="scorecard-order">Orden de papeletas</Label>
          <Select
            value={config.scorecardOrder}
            onValueChange={(v) =>
              updateConfig({ scorecardOrder: v as ScorecardOrder })
            }
          >
            <SelectTrigger id="scorecard-order">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="natural">
                Por fila, página a página (1/2/3/4 …)
              </SelectItem>
              <SelectItem value="stacked">
                Por columna apilada (1/4/7/10 …)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ConfigSwitch
        id="cover-sheets"
        label="Imprimir portadas de papeletas"
        checked={config.printScorecardsCoverSheets}
        onCheckedChange={(checked) =>
          updateConfig({ printScorecardsCoverSheets: checked })
        }
      />
      <ConfigSwitch
        id="local-names"
        label="Intercambiar nombre latino con el local"
        checked={config.localNamesFirst}
        onCheckedChange={(checked) =>
          updateConfig({ localNamesFirst: checked })
        }
      />
      <ConfigSwitch
        id="one-name"
        label="Solo un nombre (sin local/latino entre paréntesis)"
        checked={config.printOneName}
        onCheckedChange={(checked) => updateConfig({ printOneName: checked })}
      />
      <div className="space-y-1">
        <ConfigSwitch
          id="print-stations"
          label="Imprimir número de estación"
          checked={config.printStations}
          onCheckedChange={(checked) =>
            updateConfig({ printStations: checked })
          }
        />
        <p className="text-xs text-muted-foreground pl-0 sm:pl-1">
          Solo afecta la impresión; asegúrate de tener suficientes estaciones
          por grupo.
        </p>
      </div>
      <ConfigSwitch
        id="print-pbs"
        label="Imprimir récords personales (PB single / average)"
        checked={config.printPersonalBests}
        onCheckedChange={(checked) =>
          updateConfig({ printPersonalBests: checked })
        }
      />
      <ConfigSwitch
        id="print-qr"
        label="Imprimir código QR (ID de inscrito + ronda)"
        checked={config.printScorecardQr}
        onCheckedChange={(checked) =>
          updateConfig({ printScorecardQr: checked })
        }
      />

      <Separator />

      <div>
        <h4 className="font-medium text-sm">Verificación de mezclas</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Las casillas de scramble checker no se imprimen para 5x5x5, 6x6x6,
          7x7x7 ni Megaminx.
        </p>
      </div>
      <ConfigSwitch
        id="checker-top"
        label="Casilla de scramble checker para top ranked (WR50 single o WR50/NR15 average)"
        checked={config.printScrambleCheckerForTopRankedCompetitors}
        onCheckedChange={(checked) =>
          updateConfig({
            printScrambleCheckerForTopRankedCompetitors: checked,
          })
        }
      />
      <ConfigSwitch
        id="checker-finals"
        label="Casilla de scramble checker en rondas finales"
        checked={config.printScrambleCheckerForFinalRounds}
        onCheckedChange={(checked) =>
          updateConfig({ printScrambleCheckerForFinalRounds: checked })
        }
      />
      <ConfigSwitch
        id="checker-blank"
        label="Casilla de scramble checker en papeletas en blanco"
        checked={config.printScrambleCheckerForBlankScorecards}
        onCheckedChange={(checked) =>
          updateConfig({
            printScrambleCheckerForBlankScorecards: checked,
          })
        }
      />

      <ScorecardBackgroundField
        config={config}
        updateConfig={updateConfig}
        competitionImageUrl={competitionImageUrl}
      />
    </section>
  );
}
