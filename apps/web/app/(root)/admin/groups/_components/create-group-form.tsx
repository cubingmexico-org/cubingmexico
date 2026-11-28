"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { createGroupAction } from "@/app/(root)/groups/_lib/actions";
import { groupIdFromName } from "@/lib/groups";

export function CreateGroupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  function resetForm(form: HTMLFormElement) {
    form.reset();
    setName("");
    setSlug("");
    setSlugEdited(false);
  }

  return (
    <form
      className="grid max-w-lg gap-4 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const id = slug || groupIdFromName(name);
        startTransition(async () => {
          const result = await createGroupAction({
            id,
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
          resetForm(formElement);
          router.refresh();
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
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(event) => {
            const next = event.target.value;
            setName(next);
            if (!slugEdited) {
              setSlug(groupIdFromName(next));
            }
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="id">Slug</Label>
        <Input
          id="id"
          name="id"
          placeholder="vallarta"
          required
          value={slug}
          onChange={(event) => {
            setSlugEdited(true);
            setSlug(
              event.target.value
                .normalize("NFD")
                .replace(/\p{M}/gu, "")
                .toLowerCase()
                .replace(/[^a-z0-9-]+/g, "-")
                .replace(/-{2,}/g, "-")
                .replace(/^-+/, "")
                .slice(0, 32),
            );
          }}
        />
        <p className="text-xs text-muted-foreground">
          Se genera desde el nombre; puedes editarlo.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Input id="description" name="description" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="regionLabel">Ubicación / Región</Label>
        <Input
          id="regionLabel"
          name="regionLabel"
          placeholder="Ciudad, Estado"
        />
        <p className="text-xs text-muted-foreground">
          Comunidades: zona o región. Patrocinadores: ciudad y estado de la
          tienda.
        </p>
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
