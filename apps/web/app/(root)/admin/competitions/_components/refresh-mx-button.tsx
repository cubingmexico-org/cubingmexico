"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
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

export function RefreshMxCompetitionsButton() {
  const [pending, setPending] = React.useState(false);

  async function run() {
    setPending(true);
    try {
      const response = await fetch("/api/admin/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "/update-existing-mexican-competitions",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(
          String(
            data?.message ||
              data?.data?.error ||
              data?.data?.message ||
              "Error al sincronizar",
          ),
        );
        return;
      }
      toast.success("Sincronización de competencias MX completada");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al sincronizar",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          {pending ? "Sincronizando..." : "Sincronizar desde export WCA"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Sincronizar competencias mexicanas?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Ejecuta `/update-existing-mexican-competitions` en el backend. Esto
            actualiza metadatos desde el export; la asignación manual de estado
            sigue siendo la fuente confiable para `stateId`.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => void run()}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
