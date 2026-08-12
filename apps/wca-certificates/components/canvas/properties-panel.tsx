"use client";

import { useCanvasStore } from "@/lib/canvas-store";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Slider } from "@workspace/ui/components/slider";
import { AlignCenter, AlignLeft, AlignRight, Bold, Trash2 } from "lucide-react";
import {
  ColorPicker,
  ColorPickerAlphaSlider,
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerEyeDropper,
  ColorPickerFormatSelect,
  ColorPickerHueSlider,
  ColorPickerInput,
  ColorPickerSwatch,
  ColorPickerTrigger,
} from "@workspace/ui/components/color-picker";
import { FontsCombobox } from "./fonts-combobox";
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
import type { EventId } from "@/types/wcif";
import { MentionTagsInput } from "./mention-tags-input";

interface PropertiesPanelProps {
  eventIds: EventId[];
}

export function PropertiesPanel({ eventIds }: PropertiesPanelProps) {
  const {
    elements,
    selectedElementId,
    updateElement,
    deleteElement,
    activeSide,
  } = useCanvasStore();

  // Get elements for the active side
  const currentElements = elements[activeSide] || [];
  const selectedElement = currentElements.find(
    (el) => el.id === selectedElementId,
  );

  if (!selectedElement) {
    return (
      <div className="w-100 bg-card border-l border-border p-4">
        <p className="text-sm text-muted-foreground">
          Selecciona un elemento para editar sus propiedades.
        </p>
      </div>
    );
  }

  return (
    <div className="w-100 bg-card border-l border-border p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Propiedades</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => deleteElement(selectedElement.id)}
          title="Eliminar elemento"
        >
          <Trash2 />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Posición</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="x" className="text-xs">
                X
              </Label>
              <Input
                id="x"
                type="number"
                value={Math.round(selectedElement.x)}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    x: Number(e.target.value),
                  })
                }
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="y" className="text-xs">
                Y
              </Label>
              <Input
                id="y"
                type="number"
                value={Math.round(selectedElement.y)}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    y: Number(e.target.value),
                  })
                }
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
              <Input
                id="width"
                type="number"
                value={Math.round(selectedElement.width)}
                onChange={(e) => {
                  const newWidth = Number(e.target.value);
                  const updates: Partial<typeof selectedElement> = {
                    width: newWidth,
                  };

                  // Always sync height when aspect ratio is locked for images
                  if (
                    (selectedElement.type === "image" ||
                      selectedElement.type === "qrcode") &&
                    selectedElement.keepAspectRatio
                  ) {
                    updates.height = newWidth;
                  }

                  if (selectedElement.imageUrl === "/country.svg") {
                    updates.height = (newWidth * 4) / 7;
                  }

                  if (selectedElement.imageUrl === "/events.svg") {
                    const spacing = 5;
                    const iconSize =
                      (newWidth + spacing) / eventIds.length - spacing;
                    updates.height = iconSize;
                  }

                  updateElement(selectedElement.id, updates);
                }}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="height" className="text-xs">
                Altura
              </Label>
              <Input
                id="height"
                type="number"
                value={Math.round(selectedElement.height)}
                onChange={(e) => {
                  const newHeight = Number(e.target.value);
                  const updates: Partial<typeof selectedElement> = {
                    height: newHeight,
                  };

                  // Always sync width when aspect ratio is locked for images
                  if (
                    (selectedElement.type === "image" ||
                      selectedElement.type === "qrcode") &&
                    selectedElement.keepAspectRatio
                  ) {
                    updates.width = newHeight;
                  }

                  if (selectedElement.imageUrl === "/country.svg") {
                    updates.width = (newHeight * 7) / 4;
                  }

                  if (selectedElement.imageUrl === "/events.svg") {
                    const iconSize = newHeight;
                    const spacing = 5;
                    const totalWidth =
                      iconSize * eventIds.length +
                      spacing * (eventIds.length - 1);
                    updates.width = totalWidth;
                  }

                  updateElement(selectedElement.id, updates);
                }}
                className="h-8"
                disabled={
                  (selectedElement.type === "image" ||
                    selectedElement.type === "qrcode") &&
                  selectedElement.keepAspectRatio
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rotation" className="text-xs">
            Rotación: {selectedElement.rotation}°
          </Label>
          <Slider
            id="rotation"
            min={0}
            max={360}
            step={1}
            value={[selectedElement.rotation]}
            onValueChange={([value]) =>
              updateElement(selectedElement.id, { rotation: value })
            }
          />
        </div>

        <div>
          <Label htmlFor="opacity" className="text-xs">
            Opacidad: {selectedElement.opacity ?? 1}
          </Label>
          <Slider
            id="opacity"
            min={0}
            max={1}
            step={0.01}
            value={[selectedElement.opacity ?? 1]}
            onValueChange={([value]) =>
              updateElement(selectedElement.id, { opacity: value })
            }
          />
        </div>

        {selectedElement.type === "text" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="content" className="text-xs">
                Contenido del texto
              </Label>
              <MentionTagsInput
                className="max-w-100"
                id="content"
                content={selectedElement.content || ""}
                onContentChange={(content) => {
                  const canvas = document.createElement("canvas");
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    const fontWeight = selectedElement.fontWeight || "normal";
                    ctx.font = `${fontWeight} ${selectedElement.fontSize || 24}px ${selectedElement.fontFamily || "Arial"}`;
                    const metrics = ctx.measureText(content);
                    const width = metrics.width;
                    const height = (selectedElement.fontSize || 24) * 1.2;

                    updateElement(selectedElement.id, {
                      content,
                      width,
                      height,
                    });
                  } else {
                    updateElement(selectedElement.id, { content });
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <FontsCombobox
                value={selectedElement.fontFamily || "Arial"}
                onValueChange={(fontFamily) => {
                  // Measure text dimensions
                  const canvas = document.createElement("canvas");
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    const fontWeight = selectedElement.fontWeight || "normal";
                    ctx.font = `${fontWeight} ${selectedElement.fontSize || 24}px ${fontFamily}`;
                    const metrics = ctx.measureText(
                      selectedElement.content || "",
                    );
                    const width = metrics.width;
                    const height = (selectedElement.fontSize || 24) * 1.2;

                    updateElement(selectedElement.id, {
                      fontFamily,
                      width,
                      height,
                    });
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fontSize" className="text-xs">
                Tamaño de fuente
              </Label>
              <Input
                id="fontSize"
                type="number"
                value={Number((selectedElement.fontSize || 24).toFixed(2))}
                onChange={(e) => {
                  const fontSize = Number(e.target.value);

                  // Measure text dimensions
                  const canvas = document.createElement("canvas");
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    const fontWeight = selectedElement.fontWeight || "normal";
                    ctx.font = `${fontWeight} ${fontSize}px ${selectedElement.fontFamily || "Arial"}`;
                    const metrics = ctx.measureText(
                      selectedElement.content || "",
                    );
                    const width = metrics.width;
                    const height = fontSize * 1.2;

                    updateElement(selectedElement.id, {
                      fontSize,
                      width,
                      height,
                    });
                  }
                }}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Estilo de texto</Label>
              <div className="flex gap-1">
                <Button
                  variant={
                    selectedElement.fontWeight === "bold"
                      ? "default"
                      : "outline"
                  }
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const newWeight =
                      selectedElement.fontWeight === "bold" ? "normal" : "bold";

                    // Measure text dimensions with new weight
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      ctx.font = `${newWeight} ${selectedElement.fontSize || 24}px ${selectedElement.fontFamily || "Arial"}`;
                      const metrics = ctx.measureText(
                        selectedElement.content || "",
                      );
                      const width = metrics.width;
                      const height = (selectedElement.fontSize || 24) * 1.2;

                      updateElement(selectedElement.id, {
                        fontWeight: newWeight,
                        width,
                        height,
                      });
                    } else {
                      updateElement(selectedElement.id, {
                        fontWeight: newWeight,
                      });
                    }
                  }}
                  title="Negrita"
                >
                  <Bold />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Alineación de texto</Label>
              <div className="flex gap-1">
                <Button
                  variant={
                    selectedElement.textAlign === "left" ? "default" : "outline"
                  }
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateElement(selectedElement.id, { textAlign: "left" })
                  }
                >
                  <AlignLeft />
                </Button>
                <Button
                  variant={
                    selectedElement.textAlign === "center"
                      ? "default"
                      : "outline"
                  }
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateElement(selectedElement.id, { textAlign: "center" })
                  }
                >
                  <AlignCenter />
                </Button>
                <Button
                  variant={
                    selectedElement.textAlign === "right"
                      ? "default"
                      : "outline"
                  }
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateElement(selectedElement.id, { textAlign: "right" })
                  }
                >
                  <AlignRight />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="textColor" className="text-xs">
                Color del texto
              </Label>
              <ColorPicker
                value={selectedElement.color || "#000000"}
                onValueChange={(color) => {
                  // Only update if color actually changed
                  if (color !== selectedElement.color) {
                    updateElement(selectedElement.id, { color });
                  }
                }}
                defaultFormat="hex"
                className="w-full"
              >
                <div className="flex items-center gap-3">
                  <ColorPickerTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 px-3"
                    >
                      <ColorPickerSwatch className="size-4" />
                      {selectedElement.color || "#000000"}
                    </Button>
                  </ColorPickerTrigger>
                </div>
                <ColorPickerContent>
                  <ColorPickerArea />
                  <div className="flex items-center gap-2">
                    <ColorPickerEyeDropper />
                    <div className="flex flex-1 flex-col gap-2">
                      <ColorPickerHueSlider />
                      <ColorPickerAlphaSlider />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ColorPickerFormatSelect />
                    <ColorPickerInput />
                  </div>
                </ColorPickerContent>
              </ColorPicker>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="dropShadow" className="text-xs">
                  Sombra
                </Label>
                <Switch
                  id="dropShadow"
                  checked={selectedElement.dropShadow?.enabled ?? false}
                  onCheckedChange={(checked) => {
                    const currentShadow = selectedElement.dropShadow;
                    updateElement(selectedElement.id, {
                      dropShadow: {
                        enabled: checked,
                        offsetX: currentShadow?.offsetX ?? 2,
                        offsetY: currentShadow?.offsetY ?? 2,
                        blur: currentShadow?.blur ?? 4,
                        color: currentShadow?.color ?? "#000000",
                      },
                    });
                  }}
                />
              </div>
            </div>
            {selectedElement.dropShadow?.enabled && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Desplazamiento de sombra</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="shadowOffsetX" className="text-xs">
                        X
                      </Label>
                      <Input
                        id="shadowOffsetX"
                        type="number"
                        value={selectedElement.dropShadow?.offsetX ?? 2}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            dropShadow: {
                              ...selectedElement.dropShadow,
                              enabled: true,
                              offsetX: Number(e.target.value),
                              offsetY: selectedElement.dropShadow?.offsetY ?? 2,
                              blur: selectedElement.dropShadow?.blur ?? 4,
                              color:
                                selectedElement.dropShadow?.color ?? "#000000",
                            },
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shadowOffsetY" className="text-xs">
                        Y
                      </Label>
                      <Input
                        id="shadowOffsetY"
                        type="number"
                        value={selectedElement.dropShadow?.offsetY ?? 2}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            dropShadow: {
                              ...selectedElement.dropShadow,
                              enabled: true,
                              offsetX: selectedElement.dropShadow?.offsetX ?? 2,
                              offsetY: Number(e.target.value),
                              blur: selectedElement.dropShadow?.blur ?? 4,
                              color:
                                selectedElement.dropShadow?.color ?? "#000000",
                            },
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shadowBlur" className="text-xs">
                    Desenfoque: {selectedElement.dropShadow?.blur ?? 4}px
                  </Label>
                  <Slider
                    id="shadowBlur"
                    min={0}
                    max={20}
                    step={1}
                    value={[selectedElement.dropShadow?.blur ?? 4]}
                    onValueChange={([value]) =>
                      updateElement(selectedElement.id, {
                        dropShadow: {
                          ...selectedElement.dropShadow,
                          enabled: true,
                          offsetX: selectedElement.dropShadow?.offsetX ?? 2,
                          offsetY: selectedElement.dropShadow?.offsetY ?? 2,
                          blur: value || 1,
                          color: selectedElement.dropShadow?.color ?? "#000000",
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shadowColor" className="text-xs">
                    Color de sombra
                  </Label>
                  <ColorPicker
                    value={selectedElement.dropShadow?.color || "#000000"}
                    onValueChange={(color) => {
                      // Only update if color actually changed
                      if (color !== selectedElement.dropShadow?.color) {
                        updateElement(selectedElement.id, {
                          dropShadow: {
                            ...selectedElement.dropShadow,
                            enabled: true,
                            offsetX: selectedElement.dropShadow?.offsetX ?? 2,
                            offsetY: selectedElement.dropShadow?.offsetY ?? 2,
                            blur: selectedElement.dropShadow?.blur ?? 4,
                            color,
                          },
                        });
                      }
                    }}
                    defaultFormat="hex"
                    className="w-full"
                  >
                    <div className="flex items-center gap-3">
                      <ColorPickerTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 px-3"
                        >
                          <ColorPickerSwatch className="size-4" />
                          {selectedElement.dropShadow?.color || "#000000"}
                        </Button>
                      </ColorPickerTrigger>
                    </div>
                    <ColorPickerContent>
                      <ColorPickerArea />
                      <div className="flex items-center gap-2">
                        <ColorPickerEyeDropper />
                        <div className="flex flex-1 flex-col gap-2">
                          <ColorPickerHueSlider />
                          <ColorPickerAlphaSlider />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ColorPickerFormatSelect />
                        <ColorPickerInput />
                      </div>
                    </ColorPickerContent>
                  </ColorPicker>
                </div>
              </>
            )}
          </>
        )}

        {(selectedElement.type === "rectangle" ||
          selectedElement.type === "circle") && (
          <div className="space-y-2">
            <Label htmlFor="bgColor" className="text-xs">
              Color de relleno
            </Label>
            <ColorPicker
              value={selectedElement.backgroundColor || "#3b82f6"}
              onValueChange={(color) => {
                if (color !== selectedElement.backgroundColor) {
                  updateElement(selectedElement.id, {
                    backgroundColor: color,
                  });
                }
              }}
              defaultFormat="hex"
              className="w-full"
            >
              <div className="flex items-center gap-3">
                <ColorPickerTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 px-3"
                  >
                    <ColorPickerSwatch className="size-4" />
                    {selectedElement.backgroundColor || "#3b82f6"}
                  </Button>
                </ColorPickerTrigger>
              </div>
              <ColorPickerContent>
                <ColorPickerArea />
                <div className="flex items-center gap-2">
                  <ColorPickerEyeDropper />
                  <div className="flex flex-1 flex-col gap-2">
                    <ColorPickerHueSlider />
                    <ColorPickerAlphaSlider />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ColorPickerFormatSelect />
                  <ColorPickerInput />
                </div>
              </ColorPickerContent>
            </ColorPicker>
          </div>
        )}

        {selectedElement.type === "image" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="borderRadius" className="text-xs">
                Radio de borde: {selectedElement.borderRadius || 0}%
              </Label>
              <Slider
                id="borderRadius"
                min={0}
                max={50}
                step={1}
                value={[selectedElement.borderRadius || 0]}
                onValueChange={([value]) =>
                  updateElement(selectedElement.id, { borderRadius: value })
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
                  checked={selectedElement.keepAspectRatio ?? false}
                  onCheckedChange={(checked) =>
                    updateElement(selectedElement.id, {
                      keepAspectRatio: checked,
                      isFlag: selectedElement.isFlag
                        ? false
                        : selectedElement.isFlag,
                      ...(checked && { height: selectedElement.width }),
                    })
                  }
                  disabled={
                    selectedElement.imageUrl === "/country.svg" ||
                    selectedElement.imageUrl === "/events.svg"
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Fuente de imagen</Label>
              <RadioGroup
                value={
                  selectedElement.imageUrl === "/avatar.png"
                    ? "avatar"
                    : selectedElement.imageUrl === "/team-logo.svg"
                      ? "team-logo"
                      : selectedElement.imageUrl === "/country.svg"
                        ? "country"
                        : selectedElement.imageUrl === "/events.svg"
                          ? "events"
                          : // : selectedElement.imageUrl === "/state.png"
                            // ? "state"
                            "custom"
                }
                onValueChange={(value) => {
                  const urlMap = {
                    avatar: "/avatar.png",
                    "team-logo": "/team-logo.svg",
                    country: "/country.svg",
                    // state: "/state.png",
                    custom: "/placeholder.svg",
                    events: "/events.svg",
                  };
                  updateElement(selectedElement.id, {
                    imageUrl:
                      urlMap[value as keyof typeof urlMap] ||
                      selectedElement.imageUrl,
                  });

                  if (value === "country") {
                    updateElement(selectedElement.id, {
                      isFlag: true,
                      keepAspectRatio: false,
                      height: selectedElement.width * (4 / 7),
                    });
                  }

                  if (value === "events") {
                    // Set initial dimensions based on number of events
                    const iconSize = selectedElement.height || 40;
                    const spacing = 5;
                    const totalWidth =
                      iconSize * eventIds.length +
                      spacing * (eventIds.length - 1);
                    updateElement(selectedElement.id, {
                      keepAspectRatio: false,
                      height: iconSize,
                      width: totalWidth,
                    });
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="avatar" id="avatar" />
                  <Label
                    htmlFor="avatar"
                    className="text-xs font-normal cursor-pointer"
                  >
                    Avatar del competidor
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="team-logo" id="team-logo" />
                  <Label
                    htmlFor="team-logo"
                    className="text-xs font-normal cursor-pointer"
                  >
                    Logo del Team
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="country" id="country" />
                  <Label
                    htmlFor="country"
                    className="text-xs font-normal cursor-pointer"
                  >
                    Bandera del país
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="events" id="events" />
                  <Label
                    htmlFor="events"
                    className="text-xs font-normal cursor-pointer"
                  >
                    Íconos de los eventos
                  </Label>
                </div>
                {/* <div className="flex items-center space-x-2">
                  <RadioGroupItem value="state" id="state" />
                  <Label
                    htmlFor="state"
                    className="text-xs font-normal cursor-pointer"
                  >
                    Escudo del estado
                  </Label>
                </div> */}
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
            {selectedElement.imageUrl !== "/avatar.png" &&
            selectedElement.imageUrl !== "/team-logo.svg" &&
            selectedElement.imageUrl !== "/country.svg" &&
            selectedElement.imageUrl !== "/events.svg" ? (
              // selectedElement.imageUrl !== "/state.png"
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-xs">
                  URL de la imagen
                </Label>
                <Input
                  id="imageUrl"
                  value={selectedElement.imageUrl || ""}
                  onChange={(e) =>
                    updateElement(selectedElement.id, {
                      imageUrl: e.target.value,
                    })
                  }
                  className="h-8"
                  placeholder="Ingrese la URL de la imagen"
                />
              </div>
            ) : null}
            {selectedElement.imageUrl === "/events.svg" && (
              <div className="space-y-2">
                <Label htmlFor="iconsColor" className="text-xs">
                  Color de los íconos
                </Label>
                <ColorPicker
                  value={selectedElement.color || "#000000"}
                  onValueChange={(color) => {
                    // Only update if color actually changed
                    if (color !== selectedElement.color) {
                      updateElement(selectedElement.id, { color });
                    }
                  }}
                  defaultFormat="hex"
                  className="w-full"
                >
                  <div className="flex items-center gap-3">
                    <ColorPickerTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 px-3"
                      >
                        <ColorPickerSwatch className="size-4" />
                        {selectedElement.color || "#000000"}
                      </Button>
                    </ColorPickerTrigger>
                  </div>
                  <ColorPickerContent>
                    <ColorPickerArea />
                    <div className="flex items-center gap-2">
                      <ColorPickerEyeDropper />
                      <div className="flex flex-1 flex-col gap-2">
                        <ColorPickerHueSlider />
                        <ColorPickerAlphaSlider />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ColorPickerFormatSelect />
                      <ColorPickerInput />
                    </div>
                  </ColorPickerContent>
                </ColorPicker>
              </div>
            )}
          </>
        )}

        {selectedElement.type === "qrcode" && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="keepAspectRatio" className="text-xs">
                  Mantener relación 1:1
                </Label>
                <Switch
                  id="keepAspectRatio"
                  checked={selectedElement.keepAspectRatio ?? false}
                  onCheckedChange={(checked) =>
                    updateElement(selectedElement.id, {
                      keepAspectRatio: checked,
                      ...(checked && { height: selectedElement.width }),
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Fuente de datos del QR</Label>
              <RadioGroup
                value={selectedElement.qrDataSource || "custom"}
                onValueChange={(value) =>
                  updateElement(selectedElement.id, {
                    qrDataSource: value as
                      | "wca-live"
                      | "competition-groups"
                      | "custom",
                    qrData:
                      value === "wca-live"
                        ? "https://live.worldcubeassociation.org/"
                        : value === "competition-groups"
                          ? "https://www.competitiongroups.com/"
                          : "",
                    qrIncludeIcon:
                      value === "custom"
                        ? false
                        : selectedElement.qrIncludeIcon,
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
                  checked={selectedElement.qrIncludeIcon || false}
                  onCheckedChange={(checked) =>
                    updateElement(selectedElement.id, {
                      qrIncludeIcon: checked,
                    })
                  }
                  disabled={
                    selectedElement.qrDataSource === "custom" ||
                    !selectedElement.qrDataSource
                  }
                />
              </div>
            </div>
            {selectedElement.qrDataSource !== "custom" ? null : (
              <div className="space-y-2">
                <Label htmlFor="qrData" className="text-xs">
                  Contenido del QR
                </Label>
                <Input
                  id="qrData"
                  value={selectedElement.qrData || ""}
                  onChange={(e) =>
                    updateElement(selectedElement.id, {
                      qrData: e.target.value,
                    })
                  }
                  placeholder="Contenido del QR"
                  className="h-8"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="qrForeground" className="text-xs">
                Color del QR
              </Label>
              <ColorPicker
                value={selectedElement.qrForeground || "#000000"}
                onValueChange={(color) => {
                  if (color !== selectedElement.qrForeground) {
                    updateElement(selectedElement.id, { qrForeground: color });
                  }
                }}
                defaultFormat="hex"
                className="w-full"
              >
                <div className="flex items-center gap-3">
                  <ColorPickerTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 px-3"
                    >
                      <ColorPickerSwatch className="size-4" />
                      {selectedElement.qrForeground || "#000000"}
                    </Button>
                  </ColorPickerTrigger>
                </div>
                <ColorPickerContent>
                  <ColorPickerArea />
                  <div className="flex items-center gap-2">
                    <ColorPickerEyeDropper />
                    <div className="flex flex-1 flex-col gap-2">
                      <ColorPickerHueSlider />
                      <ColorPickerAlphaSlider />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ColorPickerFormatSelect />
                    <ColorPickerInput />
                  </div>
                </ColorPickerContent>
              </ColorPicker>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qrBackground" className="text-xs">
                Color de fondo
              </Label>
              <ColorPicker
                value={selectedElement.qrBackground || "#ffffff"}
                onValueChange={(color) => {
                  if (color !== selectedElement.qrBackground) {
                    updateElement(selectedElement.id, { qrBackground: color });
                  }
                }}
                defaultFormat="hex"
                className="w-full"
              >
                <div className="flex items-center gap-3">
                  <ColorPickerTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 px-3"
                    >
                      <ColorPickerSwatch className="size-4" />
                      {selectedElement.qrBackground || "#ffffff"}
                    </Button>
                  </ColorPickerTrigger>
                </div>
                <ColorPickerContent>
                  <ColorPickerArea />
                  <div className="flex items-center gap-2">
                    <ColorPickerEyeDropper />
                    <div className="flex flex-1 flex-col gap-2">
                      <ColorPickerHueSlider />
                      <ColorPickerAlphaSlider />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ColorPickerFormatSelect />
                    <ColorPickerInput />
                  </div>
                </ColorPickerContent>
              </ColorPicker>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qrErrorCorrection" className="text-xs">
                Nivel de corrección de errores
              </Label>
              <Select
                value={selectedElement.qrErrorCorrection || "M"}
                onValueChange={(value) =>
                  updateElement(selectedElement.id, {
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
        )}
      </div>
    </div>
  );
}
