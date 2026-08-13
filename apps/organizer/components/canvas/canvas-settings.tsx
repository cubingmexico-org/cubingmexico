"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useCanvasStore } from "@/lib/canvas-store";
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

export function CanvasSettings() {
  const {
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    enableBackSide,
    setEnableBackSide,
    activeSide,
    setActiveSide,
  } = useCanvasStore();

  // Using 300 DPI for conversion between px <-> mm
  const DPI = 300;
  const pxToMm = (px: number) => (px * 25.4) / DPI;
  const mmToPx = (mm: number) => Math.round((mm * DPI) / 25.4);

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

  // Input min/max in mm derived from original px min/max (100 - 5000 px)
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
              <Label>Preajustes</Label>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWidth(Number(pxToMm(638).toFixed(1)));
                    setHeight(Number(pxToMm(1011).toFixed(1)));
                  }}
                >
                  CR-80 (54 mm × 85.6 mm)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWidth(Number(pxToMm(1011).toFixed(1)));
                    setHeight(Number(pxToMm(638).toFixed(1)));
                  }}
                >
                  CR-80 (85.6 mm × 54 mm)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWidth(Number(pxToMm(615).toFixed(1)));
                    setHeight(Number(pxToMm(991).toFixed(1)));
                  }}
                >
                  CR-79 (52.1 mm × 83.9 mm)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWidth(Number(pxToMm(991).toFixed(1)));
                    setHeight(Number(pxToMm(615).toFixed(1)));
                  }}
                >
                  CR-79 (83.9 mm × 52.1 mm)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWidth(Number(pxToMm(644).toFixed(1)));
                    setHeight(Number(pxToMm(1009).toFixed(1)));
                  }}
                >
                  MACP (54.5 mm × 85.4 mm)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWidth(Number(pxToMm(1009).toFixed(1)));
                    setHeight(Number(pxToMm(644).toFixed(1)));
                  }}
                >
                  MACP (85.4 mm × 54.5 mm)
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
