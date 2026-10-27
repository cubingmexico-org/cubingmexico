"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadThingError } from "uploadthing/server";
import { uploadFiles } from "@/lib/uploadthing";
import {
  clearCompetitionLogo,
  fetchCompetitionLogoForEdit,
  importCompetitionLogoFromInformation,
  updateCompetitionLogo,
} from "../../_lib/actions";
import { prepareLogoFile } from "./prepare-logo-file";

function uploadErrorMessage(err: unknown): string {
  if (err instanceof UploadThingError) {
    return (
      (err.data && "error" in err.data ? String(err.data.error) : null) ??
      err.message
    );
  }
  return err instanceof Error ? err.message : "Error al subir";
}

/** State and actions of the competition logo dialog. `open` resets the preview when it opens. */
export function useCompetitionLogo({
  competitionId,
  logo,
  open,
}: {
  competitionId: string;
  logo: string | null;
  open: boolean;
}) {
  const router = useRouter();
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
    router.refresh();
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

  async function handleFileChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      await toast
        .promise(uploadBlob(file), {
          loading: "Subiendo logo...",
          success: "Logo actualizado",
          error: uploadErrorMessage,
        })
        .unwrap();
    } catch {
      // The error toast already reports the failure.
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
      router.refresh();
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
      router.refresh();
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
      await toast
        .promise(uploadBlob(file), {
          loading: "Guardando logo transparente...",
          success: "Logo transparente guardado",
          error: (err) =>
            err instanceof Error ? err.message : "Error al guardar",
        })
        .unwrap();
    } catch {
      // The error toast already reports the failure.
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

  return {
    busy,
    erasing,
    disabled: busy || erasing,
    previewUrl,
    hasErasedLogo: erasedBlob !== null,
    fileInputRef,
    handleFileChange,
    handleImport,
    handleClear,
    handleEraseBackground,
    handleSaveErased,
    handleUndoErase,
  };
}
