"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import type { WCIF } from "@/types/wcif";
import {
  type CompetitionConfig,
  type CompetitorsSortingRule,
  type ScorecardDensity,
  type ScorecardOrder,
  type ScorecardPaperSize,
  type ScorecardsBackgroundMode,
  getCompetitionConfig,
  listRooms,
  setCompetitionConfig,
  setRoomStations,
  suggestStationsBreakdown,
} from "@/lib/groups/config";

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

export function CompetitionConfigPanel({
  wcif,
  competitionImageUrl,
  onApply,
}: {
  wcif: WCIF;
  competitionImageUrl?: string | null;
  onApply: (next: WCIF) => void;
}) {
  const config = useMemo(() => getCompetitionConfig(wcif), [wcif]);
  const rooms = useMemo(() => listRooms(wcif), [wcif]);
  const stationsSuggestion = useMemo(
    () => suggestStationsBreakdown(wcif),
    [wcif],
  );

  const updateConfig = (patch: Partial<CompetitionConfig>) => {
    onApply(setCompetitionConfig(wcif, { ...config, ...patch }));
  };

  const applySuggestedStations = () => {
    let next = wcif;
    for (const { room } of rooms) {
      next = setRoomStations(next, room.id, stationsSuggestion.perRoom);
    }
    onApply(next);
    toast.success(
      stationsSuggestion.roomCount > 1
        ? `Sugerencia: ${stationsSuggestion.perRoom} por zona (${stationsSuggestion.total} en total)`
        : `Sugerencia: ${stationsSuggestion.perRoom} estaciones`,
    );
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-lg border p-4">
        <div>
          <h3 className="font-semibold">Estaciones por sala</h3>
          <p className="text-sm text-muted-foreground">
            Timers físicos por zona. Sugerido:{" "}
            <strong>{stationsSuggestion.perRoom}</strong>
            {stationsSuggestion.roomCount > 1
              ? ` por sala (${stationsSuggestion.total} en total)`
              : " estaciones"}
            {stationsSuggestion.competitors > 0
              ? ` · ~${stationsSuggestion.competitors} inscritos en el evento más grande`
              : ""}
            . Campeonatos con muchas zonas: ajústalo a mano (puede ser 32+).
          </p>
        </div>
        <div className="space-y-3">
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay salas en el horario WCIF.
            </p>
          ) : (
            rooms.map(({ room, venueName, config: roomConfig }) => (
              <div
                key={room.id}
                className="flex flex-wrap items-center gap-3 max-w-lg"
              >
                <Label className="w-48 shrink-0 truncate" title={room.name}>
                  {room.name}
                  <span className="block text-xs text-muted-foreground font-normal">
                    {venueName}
                  </span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={64}
                  className="w-28"
                  value={roomConfig.stations}
                  onChange={(e) => {
                    onApply(
                      setRoomStations(
                        wcif,
                        room.id,
                        Number(e.target.value) || 0,
                      ),
                    );
                  }}
                />
              </div>
            ))
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={applySuggestedStations}
        >
          Aplicar sugerencia ({stationsSuggestion.perRoom}
          {stationsSuggestion.roomCount > 1 ? "/sala" : ""})
        </Button>
      </section>

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
          label="No asignar tareas a newcomers"
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

      <section className="space-y-4 rounded-lg border p-4">
        <div>
          <h3 className="font-semibold">Impresión</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <div className="space-y-2">
            <Label>Tamaño de papeleta</Label>
            <Select
              value={config.scorecardPaperSize}
              onValueChange={(v) =>
                updateConfig({ scorecardPaperSize: v as ScorecardPaperSize })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">Cuatro por página (A4)</SelectItem>
                <SelectItem value="letter">
                  Cuatro por página (Letter)
                </SelectItem>
                <SelectItem value="a6">Una por página (A6)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Densidad</Label>
            <Select
              value={config.scorecardDensity}
              onValueChange={(v) =>
                updateConfig({ scorecardDensity: v as ScorecardDensity })
              }
              disabled={config.scorecardPaperSize === "a6"}
            >
              <SelectTrigger>
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
            <Label>Orden de papeletas</Label>
            <Select
              value={config.scorecardOrder}
              onValueChange={(v) =>
                updateConfig({ scorecardOrder: v as ScorecardOrder })
              }
            >
              <SelectTrigger>
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

        <div className="space-y-3 max-w-xl">
          <div className="space-y-2">
            <Label>Imagen de fondo</Label>
            <Select
              value={config.scorecardsBackgroundMode}
              onValueChange={(v) =>
                updateConfig({
                  scorecardsBackgroundMode: v as ScorecardsBackgroundMode,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="competition">
                  Logo de la competencia
                  {!competitionImageUrl ? " (no disponible)" : ""}
                </SelectItem>
                <SelectItem value="custom">URL personalizada</SelectItem>
                <SelectItem value="none">Sin fondo</SelectItem>
              </SelectContent>
            </Select>
            {config.scorecardsBackgroundMode === "competition" &&
              competitionImageUrl && (
                <p
                  className="text-xs text-muted-foreground truncate"
                  title={competitionImageUrl}
                >
                  Se usará el logo guardado en Cubing México.
                </p>
              )}
            {config.scorecardsBackgroundMode === "competition" &&
              !competitionImageUrl && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Esta competencia no tiene logo en la base de datos; las
                  papeletas saldrán sin fondo hasta que subas uno o elijas una
                  URL.
                </p>
              )}
          </div>

          {config.scorecardsBackgroundMode === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="bg-url">URL de la imagen</Label>
              <Input
                id="bg-url"
                type="url"
                placeholder="https://…"
                value={config.scorecardsBackgroundUrl}
                onChange={(e) =>
                  updateConfig({ scorecardsBackgroundUrl: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                La imagen se centra en cada papeleta con baja opacidad.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ConfigSwitch({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <Label htmlFor={id} className="leading-snug cursor-pointer">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="shrink-0"
      />
    </div>
  );
}
