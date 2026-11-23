"use client";

import type { Row } from "@tanstack/react-table";
import { Loader, Trash } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { GroupMember } from "../_types";
import { deleteGroupMembers } from "../_lib/actions";

interface DeleteGroupMembersDialogProps extends React.ComponentPropsWithoutRef<
  typeof Dialog
> {
  members: Row<GroupMember>["original"][];
  groupId: string;
  showTrigger?: boolean;
  onSuccess?: () => void;
}

export function DeleteGroupMembersDialog({
  members,
  groupId,
  showTrigger = true,
  onSuccess,
  ...props
}: DeleteGroupMembersDialogProps) {
  const [isDeletePending, startDeleteTransition] = React.useTransition();
  const isDesktop = useMediaQuery("(min-width: 640px)");

  function onDelete() {
    startDeleteTransition(async () => {
      const { error, warning } = await deleteGroupMembers({
        ids: members.map((member) => member.wcaId),
        groupId,
      });

      if (error) {
        toast.error(error);
        return;
      }

      props.onOpenChange?.(false);
      if (warning) {
        toast.warning(warning);
      } else {
        toast.success("Miembros eliminados");
      }
      onSuccess?.();
    });
  }

  const description = (
    <>
      Esta acción no se puede deshacer. Esto eliminará{" "}
      <span className="font-medium">{members.length}</span>
      {members.length === 1 ? " miembro" : " miembros"} del grupo.
    </>
  );

  if (isDesktop) {
    return (
      <Dialog {...props}>
        {showTrigger ? (
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Trash className="mr-2 size-4" aria-hidden="true" />
              Eliminar ({members.length})
            </Button>
          </DialogTrigger>
        ) : null}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás absolutamente seguro?</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              aria-label="Eliminar filas seleccionadas"
              variant="destructive"
              onClick={onDelete}
              disabled={isDeletePending}
            >
              {isDeletePending && (
                <Loader
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer {...props}>
      {showTrigger ? (
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm">
            <Trash className="mr-2 size-4" aria-hidden="true" />
            Eliminar ({members.length})
          </Button>
        </DrawerTrigger>
      ) : null}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>¿Estás absolutamente seguro?</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="gap-2 sm:space-x-0">
          <DrawerClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DrawerClose>
          <Button
            aria-label="Eliminar filas seleccionadas"
            variant="destructive"
            onClick={onDelete}
            disabled={isDeletePending}
          >
            {isDeletePending && (
              <Loader className="mr-2 size-4 animate-spin" aria-hidden="true" />
            )}
            Eliminar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
