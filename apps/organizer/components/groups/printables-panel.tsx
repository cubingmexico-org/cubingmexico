"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Printer } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import type { WCIF } from "@/types/wcif";
import {
  defaultBlankCount,
  printScorecards,
  type ScorecardMode,
} from "@/lib/groups/scorecards";
import { printGroupSheets, printTaskCards } from "@/lib/groups/task-cards";
import {
  downloadScrambleMetadata,
  TNOODLE_LOCAL_URL,
} from "@/lib/groups/scramble-handoff";

export function PrintablesPanel({
  wcif,
  roundActivityCode,
}: {
  wcif: WCIF;
  roundActivityCode: string;
}) {
  const [mode, setMode] = useState<ScorecardMode>("assigned");
  const suggestedBlank = useMemo(
    () => defaultBlankCount(wcif, roundActivityCode),
    [wcif, roundActivityCode],
  );
  const [blankCount, setBlankCount] = useState(suggestedBlank);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBlankCount(suggestedBlank);
  }, [suggestedBlank]);

  const run = (fn: () => void) => {
    setError(null);
    try {
      fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar PDF");
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="font-semibold">Scorecards</h3>
          <p className="text-sm text-muted-foreground">
            Hojas de resultados para la ronda seleccionada (borrador local).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 w-44">
            <Label>Modo</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as ScorecardMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assigned">Con asignaciones</SelectItem>
                <SelectItem value="blank">En blanco</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "blank" && (
            <div className="space-y-1 w-32">
              <Label htmlFor="blank-count">Cantidad</Label>
              <Input
                id="blank-count"
                type="number"
                min={1}
                max={500}
                value={blankCount}
                onChange={(e) =>
                  setBlankCount(Number(e.target.value) || suggestedBlank)
                }
              />
            </div>
          )}
          <Button
            type="button"
            onClick={() =>
              run(() =>
                printScorecards(
                  wcif,
                  roundActivityCode,
                  mode,
                  blankCount,
                  "open",
                ),
              )
            }
          >
            <Printer className="size-4" />
            Abrir
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              run(() =>
                printScorecards(
                  wcif,
                  roundActivityCode,
                  mode,
                  blankCount,
                  "download",
                ),
              )
            }
          >
            <Download className="size-4" />
            Descargar
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="font-semibold">Hojas de grupo</h3>
          <p className="text-sm text-muted-foreground">
            Lista de competidores y staff por grupo de la ronda actual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() =>
              run(() => printGroupSheets(wcif, roundActivityCode, "open"))
            }
          >
            <Printer className="size-4" />
            Abrir
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              run(() => printGroupSheets(wcif, roundActivityCode, "download"))
            }
          >
            <Download className="size-4" />
            Descargar
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="font-semibold">Tarjetas de tareas</h3>
          <p className="text-sm text-muted-foreground">
            Una tarjeta por persona con su línea de tiempo de asignaciones.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => run(() => printTaskCards(wcif, "open"))}
          >
            <Printer className="size-4" />
            Abrir
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => run(() => printTaskCards(wcif, "download"))}
          >
            <Download className="size-4" />
            Descargar
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="font-semibold">Mezclas (TNoodle)</h3>
          <p className="text-sm text-muted-foreground">
            Exporta metadatos alineados con{" "}
            <code className="text-xs font-mono">scrambleSetCount</code> y abre
            TNoodle local. Debes tener el JAR de TNoodle en ejecución.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => run(() => downloadScrambleMetadata(wcif))}
          >
            <Download className="size-4" />
            Metadatos JSON
          </Button>
          <Button type="button" variant="outline" asChild>
            <a
              href={TNOODLE_LOCAL_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" />
              Abrir TNoodle
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
