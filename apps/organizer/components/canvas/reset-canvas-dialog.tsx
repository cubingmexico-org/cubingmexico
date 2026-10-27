"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@workspace/ui/components/dialog";

interface ResetCanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
}

export function ResetCanvasDialog({
  open,
  onOpenChange,
  onReset,
}: ResetCanvasDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Estás seguro de reiniciar el lienzo?</DialogTitle>
          <DialogDescription>
            Esta acción reemplazará todos los elementos con el gafete clásico
            predeterminado y quitará los fondos. Esta acción no se puede
            deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cerrar
            </Button>
          </DialogClose>
          <Button onClick={onReset}>Reiniciar lienzo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
