"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { FileUploader } from "@/components/file-uploader";

export function BadgeBackgroundsCard({
  enableBackSide,
  files,
  setFiles,
  backFiles,
  setBackFiles,
}: {
  enableBackSide: boolean;
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  backFiles: File[];
  setBackFiles: Dispatch<SetStateAction<File[]>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {enableBackSide ? "Fondos del Gafete" : "Fondo del Gafete"}
        </CardTitle>
        <CardDescription>
          {enableBackSide
            ? "Sube las imágenes de fondo para el anverso y reverso del gafete."
            : "Sube una imagen de fondo para el gafete."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {enableBackSide && <Label>Fondo Anverso</Label>}
        <FileUploader files={files} setFiles={setFiles} />
        {enableBackSide && (
          <>
            <Label>Fondo Reverso</Label>
            <FileUploader files={backFiles} setFiles={setBackFiles} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
