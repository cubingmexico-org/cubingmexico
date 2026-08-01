"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { User } from "next-auth";
import { Label } from "@workspace/ui/components/label";
import { State } from "@workspace/db/schema";
import { Check, Info, X } from "lucide-react";
import { useActionState } from "react";
import { profileFormAction } from "@/app/actions";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

interface ProfileProps {
  user: User;
  person: {
    wcaId: string;
    name: string | null;
    gender: "m" | "f" | "o" | null;
    stateId: string | null;
  };
  states: State[];
}

export function Profile({ user, person, states }: ProfileProps) {
  const [state, formAction, pending] = useActionState(profileFormAction, {
    defaultValues: {
      stateId: person.stateId || "",
      personId: person.wcaId,
    },
    success: false,
    errors: null,
  });

  return (
    <>
      <h1 className="text-2xl font-bold mb-2 text-center">{user.name}</h1>

      {person.stateId && (
        <Alert className="bg-yellow-50 border-yellow-200 dark:border-yellow-300 dark:bg-yellow-900 mb-6">
          <AlertDescription className="inline text-black dark:text-white">
            No puedes cambiar tu estado. Contacta a un{" "}
            <a
              href="https://www.instagram.com/cubingmexico"
              className="text-orange-500 dark:text-orange-400 hover:underline"
            >
              administrador
            </a>{" "}
            para cambiar este dato.
          </AlertDescription>
        </Alert>
      )}

      {state.success ? (
        <Alert className="bg-green-50 border-green-500 dark:border-green-600 dark:bg-green-900 mb-6">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            Éxito
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300 inline">
            Los cambios se han guardado correctamente.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {state.errors && (
            <Alert className="bg-red-50 border-red-500 dark:border-red-600 dark:bg-red-900 mb-6">
              <X className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800 dark:text-red-200">
                Error
              </AlertTitle>
              <AlertDescription className="text-red-700 dark:text-red-300 inline">
                {Object.values(state.errors).join(", ")}
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      <Tabs defaultValue="general" className="w-full">
        <div className="border-b mb-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger disabled value="preferences">
              Preferencias
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general">
          <form action={formAction} className="space-y-6">
            <input
              type="hidden"
              name="personId"
              defaultValue={person.wcaId}
              readOnly
            />

            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre</Label>
              <Input id="fullName" value={user.name || ""} disabled />
            </div>

            <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="gender">Género</Label>
                <Select defaultValue={person.gender!} disabled>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona género" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">Masculino</SelectItem>
                    <SelectItem value="f">Femenino</SelectItem>
                    <SelectItem value="o">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div
                className="group/field grid gap-2"
                data-invalid={!!state.errors}
              >
                <Label
                  htmlFor="state"
                  className="group-data-[invalid=true]/field:text-destructive flex items-center gap-2"
                >
                  Representando
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Elige bien, cambiarlo requiere contactar a un
                        administrador.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select
                  defaultValue={state.defaultValues.stateId || undefined}
                  aria-invalid={!!state.errors}
                  aria-errormessage="error-stateId"
                  name="stateId"
                  disabled={!!person.stateId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent
                    id="state"
                    className="group-data-[invalid=true]/field:border-destructive focus-visible:group-data-[invalid=true]/field:ring-destructive"
                  >
                    {states.map((state) => (
                      <SelectItem key={state.id} value={state.id}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {state.errors && (
                  <p id="error-name" className="text-destructive text-sm">
                    {state.errors}
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="font-medium">
                Tu ID de la WCA es <span className="font-mono">{user.id}</span>
              </p>
            </div>

            <div>
              <Button
                type="submit"
                disabled={person.stateId !== null || pending}
              >
                {pending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </>
  );
}
