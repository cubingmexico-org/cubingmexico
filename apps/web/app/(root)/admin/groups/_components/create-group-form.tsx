"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { createGroupAction } from "@/app/(root)/groups/_lib/actions";

export function CreateGroupForm() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid max-w-lg gap-4 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await createGroupAction({
            id: String(form.get("id") ?? ""),
            kind: String(form.get("kind") ?? "community") as
              | "community"
              | "sponsor",
            name: String(form.get("name") ?? ""),
            description: String(form.get("description") ?? "") || null,
            regionLabel: String(form.get("regionLabel") ?? "") || null,
            websiteUrl: String(form.get("websiteUrl") ?? "") || null,
          });
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(`Grupo ${result.data?.id} creado`);
          event.currentTarget.reset();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="kind">Tipo</Label>
        <select
          id="kind"
          name="kind"
          defaultValue="community"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
        >
          <option value="community">Comunidad</option>
          <option value="sponsor">Patrocinador</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="id">Slug</Label>
        <Input id="id" name="id" placeholder="vallarta" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Input id="description" name="description" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="regionLabel">Región (comunidades)</Label>
        <Input id="regionLabel" name="regionLabel" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="websiteUrl">Sitio web (patrocinadores)</Label>
        <Input id="websiteUrl" name="websiteUrl" />
      </div>
      <Button type="submit" disabled={pending}>
        Crear
      </Button>
    </form>
  );
}
