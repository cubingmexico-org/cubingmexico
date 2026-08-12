"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eraser, ImagePlus, Loader2, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { uploadFiles } from "@/lib/uploadthing";
import { UploadThingError } from "uploadthing/server";
import {
  clearCompetitionLogo,
  fetchCompetitionLogoForEdit,
  importCompetitionLogoFromInformation,
  updateCompetitionLogo,
} from "../../_lib/actions";

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
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(logo);
  const [erasedBlob, setErasedBlob] = React.useState<Blob | null>(null);
  const [erasing, setErasing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setPreviewUrl(logo);
      setErasedBlob(null);
    }
  }, [open, logo]);

  React.useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function refresh() {
    router.refresh();
  }

  async function persistLogoUrl(url: string) {
    const result = await updateCompetitionLogo({
      competitionId,
      logo: url,
    });
    if (result.error) {
      throw new Error(result.error);
    }
    setPreviewUrl(url);
    setErasedBlob(null);
    await refresh();
  }

  async function uploadBlob(file: File) {
    const renamed = new File([file], `${competitionId}-logo.png`, {
      type: file.type || "image/png",
    });

    const data = await uploadFiles("competitionLogoUploader", {
      files: [renamed],
      headers: {
        "x-competition-id": competitionId,
      },
    });

    const logoUrl = data[0]?.serverData.logo;
    if (!logoUrl) {
      throw new Error("No se recibió URL del logo");
    }
    await persistLogoUrl(logoUrl);
  }

  /**
   * Downscale large transparent PNGs so UploadThing accepts them and logos
   * stay reasonably sized for UI use.
   */
  async function prepareLogoFile(blob: Blob, fileName: string): Promise<File> {
    const maxEdge = 1200;
    const maxBytes = 7.5 * 1024 * 1024;

    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return new File([blob], fileName, { type: "image/png" });
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let outBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );

    // If still huge, try a slightly smaller edge.
    if (outBlob && outBlob.size > maxBytes) {
      const retryScale = Math.sqrt(maxBytes / outBlob.size) * 0.95;
      const w2 = Math.max(1, Math.round(width * retryScale));
      const h2 = Math.max(1, Math.round(height * retryScale));
      canvas.width = w2;
      canvas.height = h2;
      ctx.clearRect(0, 0, w2, h2);
      const retryBitmap = await createImageBitmap(blob);
      ctx.drawImage(retryBitmap, 0, 0, w2, h2);
      retryBitmap.close();
      outBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
    }

    if (!outBlob) {
      return new File([blob], fileName, { type: "image/png" });
    }

    return new File([outBlob], fileName, { type: "image/png" });
  }

  async function handleFileChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      await toast.promise(uploadBlob(file), {
        loading: "Subiendo logo...",
        success: "Logo actualizado",
        error: (err) =>
          err instanceof UploadThingError
            ? ((err.data && "error" in err.data
                ? String(err.data.error)
                : null) ?? err.message)
            : err instanceof Error
              ? err.message
              : "Error al subir",
      });
    } finally {
      setBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleImport() {
    setBusy(true);
    try {
      const result = await importCompetitionLogoFromInformation({
        competitionId,
        overwrite: Boolean(logo),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.data?.logo) {
        setPreviewUrl(result.data.logo);
        setErasedBlob(null);
      }
      toast.success(
        result.data?.skipped
          ? "El logo ya existía"
          : "Logo importado desde información",
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    try {
      const result = await clearCompetitionLogo({ competitionId });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPreviewUrl(null);
      setErasedBlob(null);
      toast.success("Logo eliminado");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleEraseBackground() {
    setErasing(true);
    let temporaryBlobUrl: string | null = null;

    try {
      let source: string | Blob;

      if (erasedBlob) {
        source = erasedBlob;
      } else if (
        previewUrl?.startsWith("blob:") ||
        previewUrl?.startsWith("data:")
      ) {
        source = previewUrl;
      } else if (logo || previewUrl) {
        // Remote URLs (WCA Active Storage) need a server fetch to avoid CORS.
        const fetched = await fetchCompetitionLogoForEdit({ competitionId });
        if (fetched.error || !fetched.data?.dataUrl) {
          throw new Error(fetched.error ?? "No se pudo cargar el logo");
        }
        source = fetched.data.dataUrl;
      } else {
        toast.error("No hay logo para procesar");
        return;
      }

      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(source, {
        output: { format: "image/png", quality: 0.9 },
      });
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      temporaryBlobUrl = URL.createObjectURL(blob);
      setPreviewUrl(temporaryBlobUrl);
      setErasedBlob(blob);
      toast.success("Fondo eliminado — guarda para subir a UploadThing");
    } catch (err) {
      if (temporaryBlobUrl) {
        URL.revokeObjectURL(temporaryBlobUrl);
      }
      toast.error(
        err instanceof Error ? err.message : "No se pudo eliminar el fondo",
      );
    } finally {
      setErasing(false);
    }
  }

  async function handleSaveErased() {
    if (!erasedBlob) return;
    setBusy(true);
    try {
      const file = await prepareLogoFile(
        erasedBlob,
        `${competitionId}-logo.png`,
      );
      await toast.promise(uploadBlob(file), {
        loading: "Guardando logo transparente...",
        success: "Logo transparente guardado",
        error: (err) =>
          err instanceof Error ? err.message : "Error al guardar",
      });
    } finally {
      setBusy(false);
    }
  }

  function handleUndoErase() {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setErasedBlob(null);
    setPreviewUrl(logo);
  }

  const disabled = busy || erasing;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative flex size-10 items-center justify-center overflow-hidden rounded-md border bg-muted/40"
          title="Gestionar logo"
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
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
          <div
            className="flex size-40 items-center justify-center overflow-hidden rounded-lg border"
            style={{
              backgroundImage:
                "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
            }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={`Logo ${competitionName}`}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-muted-foreground text-sm">Sin logo</span>
            )}
          </div>

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

          {erasedBlob ? (
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={disabled || !logo}
              >
                <Trash2 className="size-4" />
                Quitar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Quitar logo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará el logo guardado de esta competencia. Podrás
                  volver a importarlo o subirlo después.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleClear()}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
