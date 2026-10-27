"use client";

import { Input } from "@workspace/ui/components/input";
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
  ScorecardsBackgroundMode,
} from "@/lib/groups/config";
import type { UpdateCompetitionConfig } from "./config-controls";

export function ScorecardBackgroundField({
  config,
  updateConfig,
  competitionImageUrl,
}: {
  config: CompetitionConfig;
  updateConfig: UpdateCompetitionConfig;
  competitionImageUrl?: string | null;
}) {
  return (
    <div className="space-y-3 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="scorecard-background">Imagen de fondo</Label>
        <Select
          value={config.scorecardsBackgroundMode}
          onValueChange={(v) =>
            updateConfig({
              scorecardsBackgroundMode: v as ScorecardsBackgroundMode,
            })
          }
        >
          <SelectTrigger id="scorecard-background">
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
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Esta competencia no tiene logo en la base de datos; las papeletas
              saldrán sin fondo hasta que subas uno o elijas una URL.
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
  );
}
