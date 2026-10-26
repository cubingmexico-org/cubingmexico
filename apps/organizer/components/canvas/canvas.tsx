"use client";

import { CanvasEditor } from "@/components/canvas/canvas-editor";
import { CanvasMenubar } from "@/components/canvas/canvas-menubar";
import { Toolbar } from "@/components/canvas/toolbar";
import { PropertiesPanel } from "@/components/canvas/properties-panel";
import { CanvasSettings } from "@/components/canvas/canvas-settings";
import { ResetCanvasDialog } from "@/components/canvas/reset-canvas-dialog";
import { useBadgeDesignIO } from "@/components/canvas/use-badge-design-io";
import { usePreviewPerson } from "@/components/canvas/use-preview-person";
import { useCanvasStore } from "@/lib/canvas-store";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { EventId, ExtendedPerson, WCIF } from "@/types/wcif";
import { State, Team } from "@/db/queries";
import {
  DesignLibraryDialog,
  type DesignLibraryDialogProps,
} from "@/components/design-library-dialog";
import { createCanvasForSide } from "@/lib/badges/preview-canvas";
import { registerBundledFonts } from "@/lib/load-fonts";

interface CanvasProps {
  states: State[];
  teams: Team[];
  eventIds: EventId[];
  persons?: ExtendedPerson[];
  wcif?: WCIF;
  competitionLogoUrl?: string | null;
}

function openCanvas(canvas: HTMLCanvasElement) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, "_blank");

    // Clean up the URL after the window loads
    if (newWindow) {
      newWindow.onload = () => {
        URL.revokeObjectURL(url);
      };
    }
  });
}

export function Canvas({
  states,
  teams,
  eventIds,
  persons = [],
  wcif,
  competitionLogoUrl,
}: CanvasProps): React.JSX.Element {
  const {
    elements,
    canvasWidth,
    canvasHeight,
    backgroundImage,
    backgroundImageBack,
    activeSide,
  } = useCanvasStore();

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    registerBundledFonts();
  }, []);
  const [cloudMode, setCloudMode] = useState<
    DesignLibraryDialogProps["mode"] | null
  >(null);

  const params = useParams();

  const competitionId = String(params.competitionId ?? "");

  const currentPerson = usePreviewPerson(persons, eventIds);

  const {
    getBadgeDesignJson,
    applyBadgeDesignJson,
    exportToJSON,
    importFromJSON,
    resetCanvas,
  } = useBadgeDesignIO(competitionId);

  const previewCanvas = async () => {
    const canvas = await createCanvasForSide({
      elements: elements[activeSide] || [],
      backgroundImage:
        activeSide === "front" ? backgroundImage : backgroundImageBack,
      canvasWidth,
      canvasHeight,
      person: currentPerson,
      states,
      teams,
      wcif,
      competitionId,
      competitionLogoUrl,
    });

    if (!canvas) return;

    openCanvas(canvas);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background border">
      {cloudMode && competitionId ? (
        <DesignLibraryDialog
          open
          onOpenChange={(open) => {
            if (!open) setCloudMode(null);
          }}
          mode={cloudMode}
          competitionId={competitionId}
          module="badges"
          getJson={() => getBadgeDesignJson()}
          onApply={(json) => applyBadgeDesignJson(json)}
        />
      ) : null}
      <CanvasSettings open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <ResetCanvasDialog
        open={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
        onReset={() => {
          resetCanvas();
          setIsResetDialogOpen(false);
        }}
      />
      <CanvasMenubar
        competitionId={competitionId}
        onReset={() => setIsResetDialogOpen(true)}
        onOpenCloud={setCloudMode}
        onExport={exportToJSON}
        onImport={importFromJSON}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onPreview={previewCanvas}
      />

      <div className="flex-1 flex overflow-hidden">
        <Toolbar />
        <CanvasEditor eventIds={eventIds} />
        <PropertiesPanel eventIds={eventIds} />
      </div>
    </div>
  );
}
