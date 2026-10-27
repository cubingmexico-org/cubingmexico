"use client";

import { Button } from "@workspace/ui/components/button";
import { Upload } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { uploadFiles } from "@/lib/uploadthing";
import { UploadThingError } from "uploadthing/server";
import { updateTeamLogoAction } from "../_lib/actions";

export function ImageUploader({ stateId }: { stateId: string }) {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      const file = files[0];
      const fileExtension = file?.name.split(".").pop();
      const renamedFile = new File(
        [file!],
        `${stateId}-image.${fileExtension}`,
        {
          type: file?.type,
        },
      );

      toast.promise(
        uploadFiles("imageUploader", {
          files: [renamedFile],
          headers: {
            "x-state-id": stateId,
          },
        }),
        {
          loading: "Subiendo...",
          success: async (data) => {
            await updateTeamLogoAction(
              stateId,
              data[0]?.serverData.image || null,
            );

            return "Imagen subida correctamente";
          },
          error: "Error",
        },
      );
    } catch (error) {
      if (error instanceof UploadThingError) {
        const errorMessage =
          error.data && "error" in error.data
            ? error.data.error
            : "Falló la carga del archivo";
        toast.error(errorMessage);
      } else {
        toast.error(
          error instanceof Error ? error.message : "Error desconocido",
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            void handleUpload(Array.from(files));
          }
        }}
        ref={fileInputRef}
        className="hidden"
        id="file-upload"
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
