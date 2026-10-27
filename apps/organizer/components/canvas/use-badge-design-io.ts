"use client";

import { toast } from "sonner";
import { useCanvasStore } from "@/lib/canvas-store";
import { reportError } from "@/lib/report-error";
import { DEFAULT_BADGE_DESIGN } from "@/data/badges";
import type { BadgeDesignFile } from "@/types/canvas";

const IMPORT_ERROR_MESSAGE =
  "Error al importar el diseño. Verifica que el archivo sea válido.";

/** Reads, writes and resets the badge design held in the canvas store. */
export function useBadgeDesignIO(competitionId: string) {
  const {
    elements,
    canvasWidth,
    canvasHeight,
    backgroundImage,
    backgroundImageBack,
    enableBackSide,
    setElements,
    setCanvasSize,
    setBackgroundImage,
    setBackgroundImageBack,
    setEnableBackSide,
  } = useCanvasStore();

  const getBadgeDesignJson = (): BadgeDesignFile => ({
    elements,
    canvasWidth,
    canvasHeight,
    backgroundImage,
    backgroundImageBack,
    enableBackSide,
  });

  const applyBadgeDesignJson = (data: unknown) => {
    if (!data || typeof data !== "object") {
      toast.error(IMPORT_ERROR_MESSAGE);
      return;
    }

    const design = data as Partial<BadgeDesignFile>;

    if (design.canvasWidth && design.canvasHeight)
      setCanvasSize(design.canvasWidth, design.canvasHeight);
    if (design.elements) setElements(design.elements);
    if (design.backgroundImage) setBackgroundImage(design.backgroundImage);
    if (design.backgroundImageBack)
      setBackgroundImageBack(design.backgroundImageBack);
    if (design.enableBackSide !== undefined)
      setEnableBackSide(design.enableBackSide);
  };

  const exportToJSON = () => {
    const data = JSON.stringify(getBadgeDesignJson(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gafete-${competitionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        applyBadgeDesignJson(JSON.parse(text));
      } catch (error) {
        reportError(error);
        toast.error(IMPORT_ERROR_MESSAGE);
      }
    };
    input.click();
  };

  const resetCanvas = () => {
    setCanvasSize(
      DEFAULT_BADGE_DESIGN.canvasWidth,
      DEFAULT_BADGE_DESIGN.canvasHeight,
    );
    setElements(DEFAULT_BADGE_DESIGN.elements);
    setBackgroundImage(undefined);
    setBackgroundImageBack(undefined);
    setEnableBackSide(DEFAULT_BADGE_DESIGN.enableBackSide);
  };

  return {
    getBadgeDesignJson,
    applyBadgeDesignJson,
    exportToJSON,
    importFromJSON,
    resetCanvas,
  };
}
