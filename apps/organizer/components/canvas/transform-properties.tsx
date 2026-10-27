"use client";

import { useCanvasStore } from "@/lib/canvas-store";
import { Label } from "@workspace/ui/components/label";
import { Slider } from "@workspace/ui/components/slider";
import type { CanvasElement } from "@/types/canvas";
import type { EventId } from "@/types/wcif";
import { NumberInput } from "@/components/number-input";

interface TransformPropertiesProps {
  element: CanvasElement;
  eventIds: EventId[];
}

export function TransformProperties({
  element,
  eventIds,
}: TransformPropertiesProps) {
  const updateElement = useCanvasStore((state) => state.updateElement);

  const ratioLocked =
    (element.type === "image" || element.type === "qrcode") &&
    element.keepAspectRatio;

  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Posición</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="x" className="text-xs">
              X
            </Label>
            <NumberInput
              id="x"
              value={Math.round(element.x)}
              onValueChange={(x) => updateElement(element.id, { x })}
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="y" className="text-xs">
              Y
            </Label>
            <NumberInput
              id="y"
              value={Math.round(element.y)}
              onValueChange={(y) => updateElement(element.id, { y })}
              className="h-8"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Tamaño</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="width" className="text-xs">
              Ancho
            </Label>
            <NumberInput
              id="width"
              value={Math.round(element.width)}
              onValueChange={(newWidth) => {
                const updates: Partial<CanvasElement> = { width: newWidth };

                if (ratioLocked) {
                  updates.height = newWidth;
                }

                if (element.imageUrl === "/country.svg") {
                  updates.height = (newWidth * 4) / 7;
                }

                if (element.imageUrl === "/events.svg") {
                  const spacing = 5;
                  const iconSize =
                    (newWidth + spacing) / eventIds.length - spacing;
                  updates.height = iconSize;
                }

                updateElement(element.id, updates);
              }}
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="height" className="text-xs">
              Altura
            </Label>
            <NumberInput
              id="height"
              value={Math.round(element.height)}
              onValueChange={(newHeight) => {
                const updates: Partial<CanvasElement> = { height: newHeight };

                if (ratioLocked) {
                  updates.width = newHeight;
                }

                if (element.imageUrl === "/country.svg") {
                  updates.width = (newHeight * 7) / 4;
                }

                if (element.imageUrl === "/events.svg") {
                  const iconSize = newHeight;
                  const spacing = 5;
                  const totalWidth =
                    iconSize * eventIds.length +
                    spacing * (eventIds.length - 1);
                  updates.width = totalWidth;
                }

                updateElement(element.id, updates);
              }}
              className="h-8"
              disabled={ratioLocked}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rotation" className="text-xs">
          Rotación: {element.rotation}°
        </Label>
        <Slider
          id="rotation"
          min={0}
          max={360}
          step={1}
          value={[element.rotation]}
          onValueChange={([value]) =>
            updateElement(element.id, { rotation: value })
          }
        />
      </div>

      <div>
        <Label htmlFor="opacity" className="text-xs">
          Opacidad: {element.opacity ?? 1}
        </Label>
        <Slider
          id="opacity"
          min={0}
          max={1}
          step={0.01}
          value={[element.opacity ?? 1]}
          onValueChange={([value]) =>
            updateElement(element.id, { opacity: value })
          }
        />
      </div>
    </>
  );
}
