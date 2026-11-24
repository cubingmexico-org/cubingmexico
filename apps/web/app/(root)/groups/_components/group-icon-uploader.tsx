"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadThingError } from "uploadthing/server";
import { Button } from "@workspace/ui/components/button";
import { uploadFiles } from "@/lib/uploadthing";
import { prepareTransparentIconFile } from "@/lib/prepare-transparent-icon";
import { updateGroupIconAction } from "../_lib/actions";

function uploadErrorMessage(error: unknown): string {
  if (error instanceof UploadThingError) {
    return error.data && "error" in error.data
      ? String(error.data.error)
      : "Falló la carga del archivo";
  }
  return error instanceof Error ? error.message : "Error desconocido";
}

export function GroupIconUploader({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await toast
        .promise(
          (async () => {
            const transparentFile = await prepareTransparentIconFile(
              file,
              `${groupId}-icon.png`,
            );
            const data = await uploadFiles("groupIconUploader", {
              files: [transparentFile],
              headers: { "x-group-id": groupId },
            });
            await updateGroupIconAction(
              groupId,
              data[0]?.serverData.icon || null,
            );
            router.refresh();
          })(),
          {
            loading: "Eliminando fondo y subiendo ícono...",
            success: "Ícono transparente subido correctamente",
            error: uploadErrorMessage,
          },
        )
        .unwrap();
    } catch {
      // Toast already reports the failure.
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/png,image/webp,image/jpeg,image/jpg"
        className="hidden"
        ref={fileInputRef}
        onChange={(event) => {
          const files = event.target.files;
          if (files && files.length > 0) {
            void handleUpload(Array.from(files));
          }
        }}
      />
      <Button
        className="mx-4"
        type="button"
        variant="outline"
        disabled={isUploading}
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload />
        Cambiar
      </Button>
    </div>
  );
}
