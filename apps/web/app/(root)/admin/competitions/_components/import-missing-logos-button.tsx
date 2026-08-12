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
import { importMissingCompetitionLogos } from "../../_lib/actions";

export function ImportMissingLogosButton() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function run() {
    setPending(true);
    try {
      const result = await importMissingCompetitionLogos({ limit: 25 });
      if (result.error || !result.data) {
        toast.error(result.error ?? "Error al importar logos");
        return;
      }

      const { imported, failed, attempted } = result.data;
      if (attempted === 0) {
        toast.message("No hay logos pendientes por importar");
      } else if (failed === 0) {
        toast.success(`Se importaron ${imported} logos`);
      } else {
        toast.warning(
          `Importados ${imported} de ${attempted}. Fallaron ${failed}.`,
        );
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al importar logos",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          {pending ? "Importando..." : "Extraer logos faltantes"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Extraer logos faltantes?</AlertDialogTitle>
          <AlertDialogDescription>
            Busca competencias MX sin logo y guarda la URL de la primera imagen
            de <code>information</code> (WCA Active Storage, sin re-subir).
            Hasta 25 por lote. No sobrescribe logos ya guardados.
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
