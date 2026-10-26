"use client";

import { useCanvasStore } from "@/lib/canvas-store";
import type { CanvasElement } from "@/types/canvas";
import { ColorField } from "./color-field";

export function ShapeProperties({ element }: { element: CanvasElement }) {
  const updateElement = useCanvasStore((state) => state.updateElement);

  return (
    <ColorField
      id="bgColor"
      label="Color de relleno"
      value={element.backgroundColor}
      fallback="#3b82f6"
      onValueChange={(color) =>
        updateElement(element.id, { backgroundColor: color })
      }
    />
  );
}
