"use client";

import { useCanvasStore } from "@/lib/canvas-store";
import { ensureFontLoaded } from "@/lib/load-fonts";
import { measureTextBox } from "@/lib/measure-text";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { AlignCenter, AlignLeft, AlignRight, Bold } from "lucide-react";
import type { CanvasElement } from "@/types/canvas";
import { NumberInput } from "@/components/number-input";
import { FontsCombobox } from "./fonts-combobox";
import { MentionTagsInput } from "./mention-tags-input";
import { ColorField } from "./color-field";
import { DropShadowProperties } from "./drop-shadow-properties";

export function TextProperties({ element }: { element: CanvasElement }) {
  const updateElement = useCanvasStore((state) => state.updateElement);

  const fontWeight = element.fontWeight || "normal";
  const fontSize = element.fontSize || 24;
  const fontFamily = element.fontFamily || "Arial";
  const content = element.content || "";

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="content" className="text-xs">
          Contenido del texto
        </Label>
        <MentionTagsInput
          className="max-w-100"
          id="content"
          content={content}
          onContentChange={(newContent) => {
            updateElement(element.id, {
              content: newContent,
              ...measureTextBox(newContent, fontWeight, fontSize, fontFamily),
            });
          }}
        />
      </div>
      <div className="space-y-2">
        <FontsCombobox
          value={fontFamily}
          onValueChange={async (newFamily) => {
            await ensureFontLoaded(newFamily, fontWeight);
            const box = measureTextBox(
              content,
              fontWeight,
              fontSize,
              newFamily,
            );
            if (box) {
              updateElement(element.id, { fontFamily: newFamily, ...box });
            }
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fontSize" className="text-xs">
          Tamaño de fuente
        </Label>
        <NumberInput
          id="fontSize"
          value={Number(fontSize.toFixed(2))}
          onValueChange={(newSize) => {
            const box = measureTextBox(
              content,
              fontWeight,
              newSize,
              fontFamily,
            );
            if (box) {
              updateElement(element.id, { fontSize: newSize, ...box });
            }
          }}
          className="h-8"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Estilo de texto</Label>
        <div className="flex gap-1">
          <Button
            variant={element.fontWeight === "bold" ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const newWeight =
                element.fontWeight === "bold" ? "normal" : "bold";
              updateElement(element.id, {
                fontWeight: newWeight,
                ...measureTextBox(content, newWeight, fontSize, fontFamily),
              });
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
            variant={element.textAlign === "left" ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => updateElement(element.id, { textAlign: "left" })}
            aria-label="Alinear a la izquierda"
            aria-pressed={element.textAlign === "left"}
          >
            <AlignLeft />
          </Button>
          <Button
            variant={element.textAlign === "center" ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => updateElement(element.id, { textAlign: "center" })}
            aria-label="Centrar"
            aria-pressed={element.textAlign === "center"}
          >
            <AlignCenter />
          </Button>
          <Button
            variant={element.textAlign === "right" ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => updateElement(element.id, { textAlign: "right" })}
            aria-label="Alinear a la derecha"
            aria-pressed={element.textAlign === "right"}
          >
            <AlignRight />
          </Button>
        </div>
      </div>
      <ColorField
        id="textColor"
        label="Color del texto"
        value={element.color}
        fallback="#000000"
        onValueChange={(color) => updateElement(element.id, { color })}
      />

      <DropShadowProperties element={element} />
    </>
  );
}
