"use client";

import { Button } from "@workspace/ui/components/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useCanvasStore } from "@/lib/canvas-store";

export function ZoomControls() {
  const { zoom, setZoom } = useCanvasStore();

  const zoomIn = () => setZoom(zoom + 0.1);
  const zoomOut = () => setZoom(zoom - 0.1);
  const resetZoom = () => setZoom(1);

  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-card border border-border rounded-lg p-2 shadow-lg z-10">
      <Button
        variant="ghost"
        size="icon"
        onClick={zoomOut}
        disabled={zoom <= 0.1}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={resetZoom}
        className="min-w-15"
      >
        {Math.round(zoom * 100)}%
      </Button>
      <Button variant="ghost" size="icon" onClick={zoomIn} disabled={zoom >= 3}>
        <ZoomIn className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button variant="ghost" size="icon" onClick={resetZoom}>
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
