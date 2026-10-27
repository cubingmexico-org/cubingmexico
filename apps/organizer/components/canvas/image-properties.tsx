"use client";

import { useCanvasStore } from "@/lib/canvas-store";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Slider } from "@workspace/ui/components/slider";
import { Switch } from "@workspace/ui/components/switch";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import type { CanvasElement } from "@/types/canvas";
import type { EventId } from "@/types/wcif";
import { ColorField } from "./color-field";

const IMAGE_SOURCES = [
  { value: "avatar", url: "/avatar.png", label: "Avatar del competidor" },
  { value: "team-logo", url: "/team-logo.svg", label: "Logo del Team" },
  {
    value: "competition-logo",
    url: "/competition-logo.svg",
    label: "Logo de la competencia",
  },
  { value: "country", url: "/country.svg", label: "Bandera del país" },
  { value: "events", url: "/events.svg", label: "Íconos de los eventos" },
  // { value: "state", url: "/state.png", label: "Escudo del estado" },
] as const;

const CUSTOM_IMAGE_URL = "/placeholder.svg";

interface ImagePropertiesProps {
  element: CanvasElement;
  eventIds: EventId[];
}

export function ImageProperties({ element, eventIds }: ImagePropertiesProps) {
  const updateElement = useCanvasStore((state) => state.updateElement);

  const source = IMAGE_SOURCES.find((s) => s.url === element.imageUrl);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="borderRadius" className="text-xs">
          Radio de borde: {element.borderRadius || 0}%
        </Label>
        <Slider
          id="borderRadius"
          min={0}
          max={50}
          step={1}
          value={[element.borderRadius || 0]}
          onValueChange={([value]) =>
            updateElement(element.id, { borderRadius: value })
          }
        />
      </div>
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
                isFlag: element.isFlag ? false : element.isFlag,
                ...(checked && { height: element.width }),
              })
            }
            disabled={
              element.imageUrl === "/country.svg" ||
              element.imageUrl === "/events.svg"
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Fuente de imagen</Label>
        <RadioGroup
          value={source?.value ?? "custom"}
          onValueChange={(value) => {
            updateElement(element.id, {
              imageUrl:
                value === "custom"
                  ? CUSTOM_IMAGE_URL
                  : IMAGE_SOURCES.find((s) => s.value === value)?.url ||
                    element.imageUrl,
            });

            if (value === "country") {
              updateElement(element.id, {
                isFlag: true,
                keepAspectRatio: false,
                height: element.width * (4 / 7),
              });
            }

            if (value === "events") {
              // Set initial dimensions based on number of events
              const iconSize = element.height || 40;
              const spacing = 5;
              const totalWidth =
                iconSize * eventIds.length + spacing * (eventIds.length - 1);
              updateElement(element.id, {
                keepAspectRatio: false,
                height: iconSize,
                width: totalWidth,
              });
            }
          }}
        >
          {IMAGE_SOURCES.map(({ value, label }) => (
            <div key={value} className="flex items-center space-x-2">
              <RadioGroupItem value={value} id={value} />
              <Label
                htmlFor={value}
                className="text-xs font-normal cursor-pointer"
              >
                {label}
              </Label>
            </div>
          ))}
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom-image" />
            <Label
              htmlFor="custom-image"
              className="text-xs font-normal cursor-pointer"
            >
              Personalizado
            </Label>
          </div>
        </RadioGroup>
      </div>
      {!source && (
        <div className="space-y-2">
          <Label htmlFor="imageUrl" className="text-xs">
            URL de la imagen
          </Label>
          <Input
            id="imageUrl"
            value={element.imageUrl || ""}
            onChange={(e) =>
              updateElement(element.id, {
                imageUrl: e.target.value,
              })
            }
            className="h-8"
            placeholder="Ingrese la URL de la imagen"
          />
        </div>
      )}
      {element.imageUrl === "/events.svg" && (
        <ColorField
          id="iconsColor"
          label="Color de los íconos"
          value={element.color}
          fallback="#000000"
          onValueChange={(color) => updateElement(element.id, { color })}
        />
      )}
    </>
  );
}
