"use client";

import * as React from "react";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { type ConfirmAction, type SocialPostType } from "./social-types";
import { platformLabel, postTypeLabel } from "./social-ui";

export function ConfirmActionDialog({
  confirmAction,
  setConfirmAction,
  runAction,
}: {
  confirmAction: ConfirmAction | null;
  setConfirmAction: React.Dispatch<React.SetStateAction<ConfirmAction | null>>;
  runAction: (
    postType: SocialPostType,
    subjectKey: string,
    action: "download" | "publish" | "mark" | "delete",
    postId?: string,
  ) => Promise<void>;
}) {
  return (
    <AlertDialog
      open={confirmAction !== null}
      onOpenChange={(open) => {
        if (!open) setConfirmAction(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirmAction?.action === "publish"
              ? `Publicar ${postTypeLabel(confirmAction.postType)}`
              : confirmAction?.action === "delete"
                ? "Eliminar del historial"
                : "Registrar publicación manual"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirmAction?.action === "publish" ? (
              <>
                Se publicará la imagen con texto del post en las plataformas
                faltantes para <strong>{confirmAction.name}</strong> vía Meta
                Graph API.
              </>
            ) : confirmAction?.action === "delete" ? (
              <>
                Se eliminará el registro
                {confirmAction.platform
                  ? ` de ${platformLabel(confirmAction.platform)}`
                  : ""}{" "}
                para <strong>{confirmAction.name}</strong>. Volverá a aparecer
                en pendientes.
              </>
            ) : (
              <>
                Marca las plataformas faltantes de{" "}
                <strong>{confirmAction?.name}</strong> como publicadas (sin
                llamar a Meta). Úsalo si ya subiste la imagen a mano.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={
              confirmAction?.action === "delete"
                ? buttonVariants({ variant: "destructive" })
                : undefined
            }
            onClick={() => {
              if (!confirmAction) return;
              const { postType, subjectKey, action, postId } = confirmAction;
              setConfirmAction(null);
              void runAction(postType, subjectKey, action, postId);
            }}
          >
            {confirmAction?.action === "publish"
              ? "Publicar"
              : confirmAction?.action === "delete"
                ? "Eliminar"
                : "Registrar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
