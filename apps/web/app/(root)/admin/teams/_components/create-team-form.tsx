"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { createTeamAction } from "@/app/(root)/admin/_lib/actions";

export function CreateTeamForm({
  states,
}: {
  states: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (states.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todos los estados ya tienen team.
      </p>
    );
  }

  return (
    <form
      className="grid max-w-lg gap-4 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const stateId = String(form.get("stateId") ?? "");
        startTransition(async () => {
          const result = await createTeamAction({
            stateId,
            name: String(form.get("name") ?? ""),
            description: String(form.get("description") ?? "") || null,
          });
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(`Team ${result.data?.stateId} creado`);
          formElement.reset();
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="stateId">Estado</Label>
        <select
          id="stateId"
          name="stateId"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          defaultValue={states[0]?.id}
        >
          {states.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.id})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" required placeholder="Team Jalisco" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Input id="description" name="description" />
      </div>
      <Button type="submit" disabled={pending}>
        Crear team
      </Button>
    </form>
  );
}
