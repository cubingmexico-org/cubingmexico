"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { importMissingCompetitionSchedules } from "../../_lib/actions";

export function ImportMissingSchedulesButton() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function onConfirm() {
    setPending(true);
    try {
      const result = await importMissingCompetitionSchedules({ limit: 15 });
      if (result.error) {
        toast.error(result.error ?? "Error al importar horarios");
        return;
      }

      const { imported, skipped, failed } = result.data ?? {
        imported: 0,
        skipped: 0,
        failed: 0,
      };

      if (imported === 0 && skipped === 0 && failed === 0) {
        toast.message("No hay horarios pendientes por importar");
      } else {
        toast.success(
          `Importados ${imported}` +
            (skipped ? `, omitidos ${skipped}` : "") +
            (failed ? `, fallidos ${failed}` : ""),
        );
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al importar horarios",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={pending}>
          {pending ? "Importando..." : "Importar horarios faltantes"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Importar horarios faltantes?</AlertDialogTitle>
          <AlertDialogDescription>
            Busca competencias MX con resultados y sin fechas de ronda, y las
            importa desde el WCIF público. Hasta 15 por lote. No sobrescribe
            horarios ya guardados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onConfirm()}>
            Importar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
