"use client";

import * as React from "react";
import { Download, Eraser, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { useCompetitionLogo } from "../_lib/use-competition-logo";
import { ClearLogoButton } from "./clear-logo-button";
import { LogoPreview } from "./logo-preview";

type CompetitionLogoCellProps = {
  competitionId: string;
  competitionName: string;
  logo: string | null;
  hasExtractableLogo: boolean;
};

export function CompetitionLogoCell({
  competitionId,
  competitionName,
  logo,
  hasExtractableLogo,
}: CompetitionLogoCellProps) {
  const [open, setOpen] = React.useState(false);
  const {
    busy,
    erasing,
    disabled,
    previewUrl,
    hasErasedLogo,
    fileInputRef,
    handleFileChange,
    handleImport,
    handleClear,
    handleEraseBackground,
    handleSaveErased,
    handleUndoErase,
  } = useCompetitionLogo({ competitionId, logo, open });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative flex size-10 items-center justify-center overflow-hidden rounded-md border bg-muted/40"
          title="Gestionar logo"
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- external WCA / UploadThing URL
            <img src={logo} alt="" className="size-full object-contain p-0.5" />
          ) : (
            <ImagePlus className="text-muted-foreground size-4" />
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Logo de competencia</DialogTitle>
          <DialogDescription>{competitionName}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <LogoPreview src={previewUrl} alt={`Logo ${competitionName}`} />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFileChange(e.target.files)}
          />

          <div className="flex w-full flex-wrap justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
              Subir
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || !hasExtractableLogo}
              onClick={() => void handleImport()}
              title={
                hasExtractableLogo
                  ? "Importar desde information"
                  : "Sin imagen en information"
              }
            >
              <Download className="size-4" />
              Importar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || !previewUrl}
              onClick={() => void handleEraseBackground()}
            >
              {erasing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Eraser className="size-4" />
              )}
              Borrar fondo
            </Button>
          </div>

          {hasErasedLogo ? (
            <div className="flex w-full flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={disabled}
                onClick={() => void handleSaveErased()}
              >
                Guardar transparente
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={handleUndoErase}
              >
                Deshacer
              </Button>
            </div>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-between">
          <ClearLogoButton
            disabled={disabled || !logo}
            onConfirm={() => void handleClear()}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
