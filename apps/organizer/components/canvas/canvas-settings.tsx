"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useCanvasStore } from "@/lib/canvas-store";
import type { CanvasElement } from "@/types/canvas";
import { Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Switch } from "@workspace/ui/components/switch";
import { Separator } from "@workspace/ui/components/separator";
import { toast } from "sonner";

const DPI = 300;
const pxToMm = (px: number) => (px * 25.4) / DPI;
const mmToPx = (mm: number) => Math.round((mm * DPI) / 25.4);

/** ~6×4″ landscape tent face at 300 DPI */
const TENT_LANDSCAPE = { width: 1800, height: 1200 };
/** ~4×6″ portrait tent face at 300 DPI */
const TENT_PORTRAIT = { width: 1200, height: 1800 };

function createTentTemplateElements(
  canvasWidth: number,
  canvasHeight: number,
): CanvasElement[] {
  const pad = Math.round(canvasWidth * 0.08);
  const contentWidth = canvasWidth - pad * 2;
  const now = Date.now();

  return [
    {
      id: `tent-station-${now}`,
      type: "text",
      x: pad,
      y: Math.round(canvasHeight * 0.18),
      width: contentWidth,
      height: Math.round(canvasHeight * 0.12),
      rotation: 0,
      opacity: 1,
      content: "Estación 1",
      fontSize: Math.round(canvasHeight * 0.08),
      fontWeight: "bold",
      textAlign: "center",
      fontFamily: "Arial",
      color: "#111827",
    },
    {
      id: `tent-event-${now + 1}`,
      type: "text",
      x: pad,
      y: Math.round(canvasHeight * 0.38),
      width: contentWidth,
      height: Math.round(canvasHeight * 0.08),
      rotation: 0,
      opacity: 1,
      content: "3x3 · Ronda 1",
      fontSize: Math.round(canvasHeight * 0.045),
      fontWeight: "normal",
      textAlign: "center",
      fontFamily: "Arial",
      color: "#374151",
    },
    {
      id: `tent-name-${now + 2}`,
      type: "text",
      x: pad,
      y: Math.round(canvasHeight * 0.55),
      width: contentWidth,
      height: Math.round(canvasHeight * 0.08),
      rotation: 0,
      opacity: 1,
      content: "@nombre",
      fontSize: Math.round(canvasHeight * 0.05),
      fontWeight: "bold",
      textAlign: "center",
      fontFamily: "Arial",
      color: "#111827",
    },
    {
      id: `tent-role-${now + 3}`,
      type: "text",
      x: pad,
      y: Math.round(canvasHeight * 0.68),
      width: contentWidth,
      height: Math.round(canvasHeight * 0.06),
      rotation: 0,
      opacity: 1,
      content: "@rol",
      fontSize: Math.round(canvasHeight * 0.035),
      fontWeight: "normal",
      textAlign: "center",
      fontFamily: "Arial",
      color: "#6b7280",
    },
  ];
}

export function CanvasSettings() {
  const {
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    enableBackSide,
    setEnableBackSide,
    activeSide,
    setActiveSide,
    setElements,
    setBackgroundImage,
    setBackgroundImageBack,
  } = useCanvasStore();

  const [width, setWidth] = useState<number>(
    Number(pxToMm(canvasWidth).toFixed(1)),
  );
  const [height, setHeight] = useState<number>(
    Number(pxToMm(canvasHeight).toFixed(1)),
  );

  useEffect(() => {
    setWidth(Number(pxToMm(canvasWidth).toFixed(1)));
    setHeight(Number(pxToMm(canvasHeight).toFixed(1)));
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    if (!enableBackSide && activeSide === "back") {
      setActiveSide("front");
    }
  }, [enableBackSide, activeSide, setActiveSide]);

  const handleApplySize = () => {
    const pxW = mmToPx(width);
    const pxH = mmToPx(height);
    setCanvasSize(pxW, pxH);
  };

  const applySizePreset = (pxW: number, pxH: number) => {
    setWidth(Number(pxToMm(pxW).toFixed(1)));
    setHeight(Number(pxToMm(pxH).toFixed(1)));
    setCanvasSize(pxW, pxH);
  };

  const applyTentTemplate = (orientation: "landscape" | "portrait") => {
    const size =
      orientation === "landscape" ? TENT_LANDSCAPE : TENT_PORTRAIT;
    setEnableBackSide(false);
    setActiveSide("front");
    setBackgroundImage(undefined);
    setBackgroundImageBack(undefined);
    setCanvasSize(size.width, size.height);
    setWidth(Number(pxToMm(size.width).toFixed(1)));
    setHeight(Number(pxToMm(size.height).toFixed(1)));
    setElements({
      front: createTentTemplateElements(size.width, size.height),
      back: [],
    });
    toast.success(
      orientation === "landscape"
        ? "Plantilla de carpa (horizontal) aplicada"
        : "Plantilla de carpa (vertical) aplicada",
    );
  };

  const minMm = Number(pxToMm(100).toFixed(1));
  const maxMm = Number(pxToMm(5000).toFixed(1));

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" title="Configuración del lienzo">
          <Settings />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto pb-4">
        <SheetHeader>
          <SheetTitle>Configuración del lienzo</SheetTitle>
          <SheetDescription>
            Personaliza el tamaño del lienzo para tus gafetes (valores en mm,
            fondo en px a 300 DPI).
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4">
          <div className="space-y-4">
            <h3 className="font-medium">Tamaño del lienzo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Ancho (mm)</Label>
                <Input
                  id="width"
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  min={minMm}
                  max={maxMm}
                  step={0.1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Altura (mm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  min={minMm}
                  max={maxMm}
                  step={0.1}
                />
              </div>
            </div>
            <Button onClick={handleApplySize} className="w-full">
              Aplicar
            </Button>

            <div className="space-y-2">
              <Label>Preajustes de gafete</Label>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applySizePreset(638, 1011)}
                >
                  CR-80 (54 mm × 85.6 mm)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applySizePreset(1011, 638)}
                >
                  CR-80 (85.6 mm × 54 mm)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applySizePreset(615, 991)}
                >
                  CR-79 (52.1 mm × 83.9 mm)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applySizePreset(991, 615)}
                >
                  CR-79 (83.9 mm × 52.1 mm)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applySizePreset(644, 1009)}
                >
                  MACP (54.5 mm × 85.4 mm)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applySizePreset(1009, 644)}
                >
                  MACP (85.4 mm × 54.5 mm)
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Carpas / mesa</Label>
              <p className="text-xs text-muted-foreground">
                Tamaño ~6×4″ (300 DPI). La plantilla reemplaza el contenido del
                frente.
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    applySizePreset(
                      TENT_LANDSCAPE.width,
                      TENT_LANDSCAPE.height,
                    )
                  }
                >
                  Carpa mesa (152×102 mm)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    applySizePreset(TENT_PORTRAIT.width, TENT_PORTRAIT.height)
                  }
                >
                  Carpa mesa vertical (102×152 mm)
                </Button>
                <Button
                  size="sm"
                  onClick={() => applyTentTemplate("landscape")}
                >
                  Aplicar plantilla de carpa
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => applyTentTemplate("portrait")}
                >
                  Aplicar plantilla vertical
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-medium">Opciones del gafete</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-back-side">Habilitar reverso</Label>
                <p className="text-xs text-muted-foreground">
                  Permite diseñar ambos lados del gafete
                </p>
              </div>
              <Switch
                id="enable-back-side"
                checked={enableBackSide}
                onCheckedChange={setEnableBackSide}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
