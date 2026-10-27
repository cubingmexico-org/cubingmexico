"use client";

import { useCanvasStore } from "@/lib/canvas-store";
import { Button } from "@workspace/ui/components/button";
import { Trash2 } from "lucide-react";
import type { EventId } from "@/types/wcif";
import { TransformProperties } from "./transform-properties";
import { TextProperties } from "./text-properties";
import { ShapeProperties } from "./shape-properties";
import { ImageProperties } from "./image-properties";
import { QrCodeProperties } from "./qr-code-properties";

interface PropertiesPanelProps {
  eventIds: EventId[];
}

export function PropertiesPanel({ eventIds }: PropertiesPanelProps) {
  const { elements, selectedElementId, deleteElement, activeSide } =
    useCanvasStore();

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
        <TransformProperties element={selectedElement} eventIds={eventIds} />

        {selectedElement.type === "text" && (
          <TextProperties element={selectedElement} />
        )}

        {(selectedElement.type === "rectangle" ||
          selectedElement.type === "circle") && (
          <ShapeProperties element={selectedElement} />
        )}

        {selectedElement.type === "image" && (
          <ImageProperties element={selectedElement} eventIds={eventIds} />
        )}

        {selectedElement.type === "qrcode" && (
          <QrCodeProperties element={selectedElement} />
        )}
      </div>
    </div>
  );
}
