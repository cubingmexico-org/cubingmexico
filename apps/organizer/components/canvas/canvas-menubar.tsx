"use client";

import { useAddCanvasElements } from "@/components/canvas/toolbar";
import type { DesignLibraryDialogProps } from "@/components/design-library-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Download,
  Eye,
  FlipHorizontal,
  RotateCcw,
  Upload,
  Cloud,
  CloudDownload,
  LayoutTemplate,
  Settings,
  Type,
  ImageIcon,
  QrCode,
  Square,
} from "lucide-react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@workspace/ui/components/menubar";
import { useCanvasStore } from "@/lib/canvas-store";

const DPI = 300;
const pxToMm = (px: number) => (px * 25.4) / DPI;

interface CanvasMenubarProps {
  competitionId: string;
  onReset: () => void;
  onOpenCloud: (mode: DesignLibraryDialogProps["mode"]) => void;
  onExport: () => void;
  onImport: () => void;
  onOpenSettings: () => void;
  onPreview: () => void;
}

export function CanvasMenubar({
  competitionId,
  onReset,
  onOpenCloud,
  onExport,
  onImport,
  onOpenSettings,
  onPreview,
}: CanvasMenubarProps): React.JSX.Element {
  const {
    canvasWidth,
    canvasHeight,
    activeSide,
    setActiveSide,
    enableBackSide,
  } = useCanvasStore();
  const { addText, addRectangle, addImage, addQRCode } = useAddCanvasElements();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between gap-4 px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">Gafetes</h1>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Archivo</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={onReset}>
                <RotateCcw />
                Reiniciar
              </MenubarItem>
              <MenubarItem
                disabled={!competitionId}
                onClick={() => onOpenCloud("save")}
              >
                <Cloud />
                Guardar en la nube
              </MenubarItem>
              <MenubarItem
                disabled={!competitionId}
                onClick={() => onOpenCloud("load")}
              >
                <CloudDownload />
                Cargar desde la nube
              </MenubarItem>
              <MenubarItem
                disabled={!competitionId}
                onClick={() => onOpenCloud("templates")}
              >
                <LayoutTemplate />
                Plantillas
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onClick={onExport}>
                <Download />
                Descargar JSON
              </MenubarItem>
              <MenubarItem onClick={onImport}>
                <Upload />
                Subir JSON
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onClick={onOpenSettings}>
                <Settings />
                Configuración del lienzo
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Insertar</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={addText}>
                <Type />
                Texto
              </MenubarItem>
              <MenubarItem onClick={addImage}>
                <ImageIcon />
                Imagen
              </MenubarItem>
              <MenubarItem onClick={addQRCode}>
                <QrCode />
                Código QR
              </MenubarItem>
              <MenubarItem onClick={addRectangle}>
                <Square />
                Cuadro
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {pxToMm(canvasWidth).toFixed(1)} × {pxToMm(canvasHeight).toFixed(1)}{" "}
          mm
        </span>
        {enableBackSide && (
          <div className="flex items-center gap-2 border-l pl-4">
            <Button
              variant={activeSide === "front" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSide("front")}
            >
              Frente
            </Button>
            <Button
              variant={activeSide === "back" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSide("back")}
            >
              <FlipHorizontal />
              Reverso
            </Button>
          </div>
        )}
      </div>
      <Button variant="default" size="sm" onClick={onPreview}>
        <Eye />
        Previsualizar
      </Button>
    </header>
  );
}
