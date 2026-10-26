"use client";

import { useCanvasStore } from "@/lib/canvas-store";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@workspace/ui/components/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { CompetitionGroups, WcaMonochrome } from "@workspace/icons";
import type { CanvasElement } from "@/types/canvas";
import { ColorField } from "./color-field";

export function QrCodeProperties({ element }: { element: CanvasElement }) {
  const updateElement = useCanvasStore((state) => state.updateElement);

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="keepAspectRatio" className="text-xs">
            Mantener relación 1:1
          </Label>
          <Switch
            id="keepAspectRatio"
            checked={element.keepAspectRatio ?? false}
            onCheckedChange={(checked) =>
              updateElement(element.id, {
                keepAspectRatio: checked,
                ...(checked && { height: element.width }),
              })
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Fuente de datos del QR</Label>
        <RadioGroup
          value={element.qrDataSource || "custom"}
          onValueChange={(value) =>
            updateElement(element.id, {
              qrDataSource: value as
                | "wca-live"
                | "wca-integrated-results"
                | "competition-groups"
                | "custom",
              qrData:
                value === "wca-live"
                  ? "https://live.worldcubeassociation.org/"
                  : value === "wca-integrated-results"
                    ? "https://www.worldcubeassociation.org/competitions/Example2025/live"
                    : value === "competition-groups"
                      ? "https://www.competitiongroups.com/"
                      : "",
              qrIncludeIcon: value === "custom" ? false : element.qrIncludeIcon,
            })
          }
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="wca-live" id="wca-live" />
            <Label
              htmlFor="wca-live"
              className="text-xs font-normal cursor-pointer"
            >
              <WcaMonochrome className="size-4" />
              WCA Live de la competencia
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="wca-integrated-results"
              id="wca-integrated-results"
            />
            <Label
              htmlFor="wca-integrated-results"
              className="text-xs font-normal cursor-pointer"
            >
              <WcaMonochrome className="size-4" />
              WCA Integrated Results
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="competition-groups"
              id="competition-groups"
            />
            <Label
              htmlFor="competition-groups"
              className="text-xs font-normal cursor-pointer"
            >
              <CompetitionGroups className="size-4" />
              Tareas del competidor en Competition Groups
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label
              htmlFor="custom"
              className="text-xs font-normal cursor-pointer"
            >
              Personalizado
            </Label>
          </div>
        </RadioGroup>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="qrIncludeIcon" className="text-xs">
            Incluir ícono
          </Label>
          <Switch
            id="qrIncludeIcon"
            checked={element.qrIncludeIcon || false}
            onCheckedChange={(checked) =>
              updateElement(element.id, {
                qrIncludeIcon: checked,
              })
            }
            disabled={
              element.qrDataSource === "custom" || !element.qrDataSource
            }
          />
        </div>
      </div>
      {element.qrDataSource !== "custom" ? null : (
        <div className="space-y-2">
          <Label htmlFor="qrData" className="text-xs">
            Contenido del QR
          </Label>
          <Input
            id="qrData"
            value={element.qrData || ""}
            onChange={(e) =>
              updateElement(element.id, {
                qrData: e.target.value,
              })
            }
            placeholder="Contenido del QR"
            className="h-8"
          />
        </div>
      )}
      <ColorField
        id="qrForeground"
        label="Color del QR"
        value={element.qrForeground}
        fallback="#000000"
        onValueChange={(color) =>
          updateElement(element.id, { qrForeground: color })
        }
      />
      <ColorField
        id="qrBackground"
        label="Color de fondo"
        value={element.qrBackground}
        fallback="#ffffff"
        onValueChange={(color) =>
          updateElement(element.id, { qrBackground: color })
        }
      />
      <div className="space-y-2">
        <Label htmlFor="qrErrorCorrection" className="text-xs">
          Nivel de corrección de errores
        </Label>
        <Select
          value={element.qrErrorCorrection || "M"}
          onValueChange={(value) =>
            updateElement(element.id, {
              qrErrorCorrection: value as "L" | "M" | "Q" | "H",
            })
          }
        >
          <SelectTrigger id="qrErrorCorrection" className="w-full">
            <SelectValue placeholder="Nivel de corrección" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="L">Bajo (L) - 7%</SelectItem>
            <SelectItem value="M">Medio (M) - 15%</SelectItem>
            <SelectItem value="Q">Alto (Q) - 25%</SelectItem>
            <SelectItem value="H">Muy Alto (H) - 30%</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
