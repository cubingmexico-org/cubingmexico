"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { UploadThingError } from "uploadthing/server";
import { Button } from "@workspace/ui/components/button";
import { uploadFiles } from "@/lib/uploadthing";
import { updateGroupIconAction } from "../_lib/actions";

export function GroupIconUploader({ groupId }: { groupId: string }) {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      const file = files[0];
      const fileExtension = file?.name.split(".").pop();
      const renamedFile = new File(
        [file!],
        `${groupId}-icon.${fileExtension}`,
        { type: file?.type },
      );

      toast.promise(
        uploadFiles("groupIconUploader", {
          files: [renamedFile],
          headers: { "x-group-id": groupId },
        }),
        {
          loading: "Subiendo...",
          success: async (data) => {
            await updateGroupIconAction(
              groupId,
              data[0]?.serverData.icon || null,
            );
            return "Ícono subido correctamente";
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
