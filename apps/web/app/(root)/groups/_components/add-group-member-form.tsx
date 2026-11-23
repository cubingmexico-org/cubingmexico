"use client";

import React, { useEffect } from "react";
import { useActionState } from "react";
import { Check, UserPlus, X } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { EventsCheckboxes } from "@/components/events-checkboxes";
import { PersonsCombobox } from "@/components/persons-combobox";
import { groupKindLabel } from "@/lib/groups";
import type { GroupKind } from "@workspace/db/schema";
import type { GroupMember } from "../_types";
import { addGroupMemberFormAction } from "../_lib/actions";
import { GroupMembersTable } from "./group-members-table";

export function AddGroupMemberForm({
  groupId,
  groupKind,
  members,
  canManageRoles,
}: {
  groupId: string;
  groupKind: GroupKind;
  members: GroupMember[];
  canManageRoles: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState(
    addGroupMemberFormAction,
    {
      defaultValues: {
        groupId,
        personId: "",
        specialties: "",
      } as Record<string, string>,
      success: false,
      errors: "" as string,
      warning: null,
    },
  );

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  const kindLabel = groupKindLabel(groupKind);

  return (
    <div>
      {state.success ? (
        <div className="container mx-auto py-3">
          <Alert className="border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-950">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-300">
              Éxito
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              {state.warning ?? "Miembro añadido exitosamente."}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Miembros del {kindLabel}</CardTitle>
          <Dialog open={open} onOpenChange={setOpen} modal={false}>
            <DialogTrigger asChild>
              <Button size="sm" type="button">
                <UserPlus />
                Añadir Miembro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-131.25">
              <form action={formAction}>
                <input type="hidden" name="groupId" value={groupId} readOnly />
                <DialogHeader>
                  <DialogTitle>Añadir Miembro al {kindLabel}</DialogTitle>
                  <DialogDescription>
                    Añade un nuevo miembro a tu {kindLabel.toLowerCase()}
                  </DialogDescription>
                </DialogHeader>
                {!state.success && state.errors ? (
                  <div className="container mx-auto py-3">
                    <Alert className="border-red-500 bg-red-50">
                      <X className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-red-800">Error</AlertTitle>
                      <AlertDescription className="text-red-700">
                        {state.errors}
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : null}
                <div className="space-y-4 py-4">
                  <div
                    className="group/field grid gap-2"
                    data-invalid={!!state.errors}
                  >
                    <PersonsCombobox
                      endpoint="/api/get-persons-not-in-group"
                      query={{ groupId }}
                      state={state}
                    />
                    {state.errors ? (
                      <p
                        id="error-personId"
                        className="text-sm text-destructive"
                      >
                        {state.errors}
                      </p>
                    ) : null}
                  </div>
                  <EventsCheckboxes />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={pending}>
                    {pending ? (
                      <span className="animate-pulse">Añadiendo...</span>
                    ) : (
                      "Añadir Miembro"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <GroupMembersTable
            members={members}
            groupId={groupId}
            canManageRoles={canManageRoles}
          />
        </CardContent>
      </Card>
    </div>
  );
}
