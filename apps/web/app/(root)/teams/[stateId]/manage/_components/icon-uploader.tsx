"use client";

import { Button } from "@workspace/ui/components/button";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { uploadFiles } from "@/lib/uploadthing";
import { UploadThingError } from "uploadthing/server";
import { updateTeamIconAction } from "../_lib/actions";

function uploadErrorMessage(error: unknown): string {
  if (error instanceof UploadThingError) {
    return error.data && "error" in error.data
      ? String(error.data.error)
      : "Falló la carga del archivo";
  }
  return error instanceof Error ? error.message : "Error desconocido";
}

export function IconUploader({ stateId }: { stateId: string }) {
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
            const data = await uploadFiles("iconUploader", {
              files: [file],
              headers: {
                "x-state-id": stateId,
              },
            });
            await updateTeamIconAction(
              stateId,
              data[0]?.serverData.icon || null,
            );
            router.refresh();
          })(),
          {
            loading: "Subiendo ícono...",
            success: "Ícono subido correctamente",
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
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            void handleUpload(Array.from(files));
          }
        }}
        ref={fileInputRef}
        className="hidden"
        id="icon-file-upload"
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
