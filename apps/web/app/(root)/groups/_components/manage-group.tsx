"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { GroupKind } from "@workspace/db/schema";
import {
  addGroupMemberFormAction,
  deleteGroupMembers,
  groupFormAction,
  setSponsorshipAction,
} from "../_lib/actions";

type Member = {
  wcaId: string;
  name: string | null;
  state: string | null;
  role: "admin" | "editor" | null;
};

type GroupData = {
  id: string;
  kind: GroupKind;
  name: string;
  description: string | null;
  regionLabel: string | null;
  websiteUrl: string | null;
  publicityBlurb: string | null;
  socialLinks: {
    email?: string;
    whatsapp?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  } | null;
  founded: Date | null;
  isActive: boolean;
  sponsorshipStatus: "inactive" | "active" | "expired";
  publicityEnabled: boolean;
};

export function ManageGroup({
  group,
  members,
  canManageRoles,
  isSuperadmin,
}: {
  group: GroupData;
  members: Member[];
  canManageRoles: boolean;
  isSuperadmin: boolean;
}) {
  const [settingsState, settingsAction, settingsPending] = useActionState(
    groupFormAction,
    {
      defaultValues: {
        name: group.name,
        description: group.description ?? "",
        email: group.socialLinks?.email ?? "",
        whatsapp: group.socialLinks?.whatsapp ?? "",
        facebook: group.socialLinks?.facebook ?? "",
        instagram: group.socialLinks?.instagram ?? "",
        twitter: group.socialLinks?.twitter ?? "",
        tiktok: group.socialLinks?.tiktok ?? "",
        founded: group.founded ? group.founded.toISOString().slice(0, 10) : "",
        isActive: group.isActive ? "on" : "",
        regionLabel: group.regionLabel ?? "",
        websiteUrl: group.websiteUrl ?? "",
        publicityBlurb: group.publicityBlurb ?? "",
      },
      success: false,
      errors: null,
    },
  );
  const [memberState, memberAction, memberPending] = useActionState(
    addGroupMemberFormAction,
    {
      defaultValues: {
        groupId: group.id,
        personId: "",
        specialties: "",
      } as Record<string, string>,
      success: false,
      errors: "" as string,
      warning: null,
    },
  );
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Configuración</h2>
        <form action={settingsAction} className="grid max-w-xl gap-4">
          <input type="hidden" name="groupId" value={group.id} />
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={
                (settingsState.defaultValues as { name?: string }).name ??
                group.name
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={group.description ?? ""}
              rows={4}
            />
          </div>
          {group.kind === "community" ? (
            <div className="space-y-2">
              <Label htmlFor="regionLabel">Región</Label>
              <Input
                id="regionLabel"
                name="regionLabel"
                defaultValue={group.regionLabel ?? ""}
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Sitio web</Label>
                <Input
                  id="websiteUrl"
                  name="websiteUrl"
                  defaultValue={group.websiteUrl ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publicityBlurb">Texto de publicidad</Label>
                <Input
                  id="publicityBlurb"
                  name="publicityBlurb"
                  defaultValue={group.publicityBlurb ?? ""}
                />
              </div>
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                defaultValue={group.socialLinks?.email ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                defaultValue={group.socialLinks?.whatsapp ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                name="facebook"
                defaultValue={group.socialLinks?.facebook ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                name="instagram"
                defaultValue={group.socialLinks?.instagram ?? ""}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              defaultChecked={group.isActive}
              className="size-4"
            />
            <Label htmlFor="isActive">Activo</Label>
          </div>
          <Button type="submit" disabled={settingsPending}>
            Guardar
          </Button>
          {settingsState.success ? (
            <p className="text-sm text-green-600">Guardado.</p>
          ) : null}
          {settingsState.errors ? (
            <p className="text-sm text-destructive">{settingsState.errors}</p>
          ) : null}
        </form>
      </section>

      {isSuperadmin && group.kind === "sponsor" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Patrocinio</h2>
          <p className="text-sm text-muted-foreground">
            Estado actual: {group.sponsorshipStatus}
            {group.publicityEnabled ? " · publicidad activa" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await setSponsorshipAction({
                    groupId: group.id,
                    sponsorshipStatus: "active",
                    publicityEnabled: true,
                  });
                  if (result.error) toast.error(result.error);
                  else toast.success("Patrocinio activado");
                })
              }
            >
              Activar + publicidad
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await setSponsorshipAction({
                    groupId: group.id,
                    sponsorshipStatus: "inactive",
                    publicityEnabled: false,
                  });
                  if (result.error) toast.error(result.error);
                  else toast.success("Patrocinio desactivado");
                })
              }
            >
              Desactivar
            </Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Agregar miembro</h2>
        <form action={memberAction} className="flex max-w-xl flex-wrap gap-3">
          <input type="hidden" name="groupId" value={group.id} />
          <Input
            name="personId"
            placeholder="WCA ID"
            className="max-w-xs"
            required
          />
          <Input
            name="specialties"
            placeholder="Especialidades (opcional)"
            className="max-w-xs"
          />
          <Button type="submit" disabled={memberPending}>
            Agregar
          </Button>
        </form>
        {memberState.success ? (
          <p className="text-sm text-green-600">
            Miembro agregado.
            {memberState.warning ? ` ${memberState.warning}` : ""}
          </p>
        ) : null}
        {memberState.errors ? (
          <p className="text-sm text-destructive">{memberState.errors}</p>
        ) : null}
        {!canManageRoles ? null : (
          <p className="text-xs text-muted-foreground">
            Los roles admin/editor se asignan desde esta misma membresía en una
            próxima iteración; por ahora agrega como miembro.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Roster</h2>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending || selected.length === 0}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteGroupMembers({
                  groupId: group.id,
                  ids: selected,
                });
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Miembros eliminados");
                  setSelected([]);
                }
                if (result.warning) toast.message(result.warning);
              })
            }
          >
            Quitar seleccionados
          </Button>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Nombre</TableHead>
                <TableHead>WCA ID</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.wcaId}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={selected.includes(member.wcaId)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelected((prev) =>
                          checked
                            ? [...prev, member.wcaId]
                            : prev.filter((id) => id !== member.wcaId),
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>{member.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {member.wcaId}
                  </TableCell>
                  <TableCell>{member.state ?? "—"}</TableCell>
                  <TableCell>{member.role ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
