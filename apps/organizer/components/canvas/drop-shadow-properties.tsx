"use client";

import { useCanvasStore } from "@/lib/canvas-store";
import { Label } from "@workspace/ui/components/label";
import { Slider } from "@workspace/ui/components/slider";
import { Switch } from "@workspace/ui/components/switch";
import type { CanvasElement } from "@/types/canvas";
import { NumberInput } from "@/components/number-input";
import { ColorField } from "./color-field";

type DropShadow = NonNullable<CanvasElement["dropShadow"]>;

function withShadow(
  shadow: CanvasElement["dropShadow"],
  updates: Partial<DropShadow>,
): DropShadow {
  return {
    ...shadow,
    enabled: true,
    offsetX: shadow?.offsetX ?? 2,
    offsetY: shadow?.offsetY ?? 2,
    blur: shadow?.blur ?? 4,
    color: shadow?.color ?? "#000000",
    ...updates,
  };
}

export function DropShadowProperties({ element }: { element: CanvasElement }) {
  const updateElement = useCanvasStore((state) => state.updateElement);
  const shadow = element.dropShadow;

  const updateShadow = (updates: Partial<DropShadow>) =>
    updateElement(element.id, { dropShadow: withShadow(shadow, updates) });

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="dropShadow" className="text-xs">
            Sombra
          </Label>
          <Switch
            id="dropShadow"
            checked={shadow?.enabled ?? false}
            onCheckedChange={(checked) => updateShadow({ enabled: checked })}
          />
        </div>
      </div>
      {shadow?.enabled && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Desplazamiento de sombra</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="shadowOffsetX" className="text-xs">
                  X
                </Label>
                <NumberInput
                  id="shadowOffsetX"
                  value={shadow?.offsetX ?? 2}
                  onValueChange={(offsetX) => updateShadow({ offsetX })}
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="shadowOffsetY" className="text-xs">
                  Y
                </Label>
                <NumberInput
                  id="shadowOffsetY"
                  value={shadow?.offsetY ?? 2}
                  onValueChange={(offsetY) => updateShadow({ offsetY })}
                  className="h-8"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shadowBlur" className="text-xs">
              Desenfoque: {shadow?.blur ?? 4}px
            </Label>
            <Slider
              id="shadowBlur"
              min={0}
              max={20}
              step={1}
              value={[shadow?.blur ?? 4]}
              onValueChange={([value]) => updateShadow({ blur: value || 1 })}
            />
          </div>
          <ColorField
            id="shadowColor"
            label="Color de sombra"
            value={shadow?.color}
            fallback="#000000"
            onValueChange={(color) => updateShadow({ color })}
          />
        </>
      )}
    </>
  );
}
