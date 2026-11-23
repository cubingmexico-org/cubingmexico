"use client";

import { Loader } from "lucide-react";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { EventsCheckboxes } from "@/components/events-checkboxes";
import type { GroupMember } from "../_types";
import { updateGroupMember } from "../_lib/actions";

interface UpdateGroupMemberSheetProps extends React.ComponentPropsWithRef<
  typeof Sheet
> {
  member: GroupMember | null;
  groupId: string;
}

export function UpdateGroupMemberSheet({
  member,
  groupId,
  ...props
}: UpdateGroupMemberSheetProps) {
  const [state, formAction, pending] = useActionState(updateGroupMember, {
    defaultValues: {
      groupId,
      personId: member?.wcaId ?? "",
      specialties: member?.specialties?.join(",") ?? "",
    },
    success: false,
    errors: null as string | null,
  });

  React.useEffect(() => {
    if (state?.success) {
      props.onOpenChange?.(false);
      toast.success("Miembro actualizado correctamente");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react only to new action results; onOpenChange is not stable
  }, [state]);

  return (
    <Sheet {...props}>
      <SheetContent className="flex flex-col gap-6 sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle>Editar miembro</SheetTitle>
          <SheetDescription>
            Cambia los eventos favoritos del competidor.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="px-6">
          <input type="hidden" name="groupId" defaultValue={groupId} />
          <input type="hidden" name="personId" defaultValue={member?.wcaId} />
          <EventsCheckboxes defaultValue={member?.specialties || []} />
          {state.errors ? (
            <p className="mt-2 text-sm text-destructive">{state.errors}</p>
          ) : null}
          <SheetFooter className="gap-2 pt-2 sm:space-x-0">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </SheetClose>
            <Button disabled={pending}>
              {pending && (
                <Loader
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Guardar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
