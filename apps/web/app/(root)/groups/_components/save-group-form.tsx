"use client";

import * as React from "react";
import { useActionState } from "react";
import { Check, Mail, Save, X } from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiWhatsapp,
} from "@icons-pack/react-simple-icons";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import type { GroupKind } from "@workspace/db/schema";
import { groupFormAction } from "../_lib/actions";

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
};

export function SaveGroupForm({ group }: { group: GroupData }) {
  const [state, formAction, pending] = useActionState(groupFormAction, {
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
  });
  const [isActive, setIsActive] = React.useState(
    Boolean(state.defaultValues.isActive),
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="groupId" value={group.id} readOnly />
      <input type="hidden" name="isActive" value={isActive ? "on" : ""} />

      {state.success ? (
        <div className="pb-3">
          <Alert className="border-green-500 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Éxito</AlertTitle>
            <AlertDescription className="text-green-700">
              Los cambios se han guardado correctamente.
            </AlertDescription>
          </Alert>
        </div>
      ) : state.errors ? (
        <div className="pb-3">
          <Alert className="border-red-500 bg-red-50">
            <X className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Error</AlertTitle>
            <AlertDescription className="text-red-700">
              {state.errors}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información del grupo</CardTitle>
            <CardDescription>
              Actualiza la información básica del perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                required
                disabled={pending}
                defaultValue={state.defaultValues.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regionLabel">
                {group.kind === "community" ? "Región" : "Ubicación"}
              </Label>
              <Input
                id="regionLabel"
                name="regionLabel"
                disabled={pending}
                placeholder={
                  group.kind === "community"
                    ? "Zona metropolitana de…"
                    : "Ciudad, Estado"
                }
                defaultValue={state.defaultValues.regionLabel}
              />
              {group.kind === "sponsor" ? (
                <p className="text-xs text-muted-foreground">
                  Ciudad y estado de la tienda, por ejemplo “Guadalajara,
                  Jalisco”.
                </p>
              ) : null}
            </div>
            {group.kind === "sponsor" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Sitio web</Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    disabled={pending}
                    defaultValue={state.defaultValues.websiteUrl}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publicityBlurb">Texto de publicidad</Label>
                  <Input
                    id="publicityBlurb"
                    name="publicityBlurb"
                    disabled={pending}
                    defaultValue={state.defaultValues.publicityBlurb}
                  />
                </div>
              </>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="founded">Fecha de fundación</Label>
              <Input
                id="founded"
                name="founded"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                disabled={pending}
                defaultValue={state.defaultValues.founded}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                rows={5}
                disabled={pending}
                defaultValue={state.defaultValues.description}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={isActive}
                disabled={pending}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="isActive">El grupo está activo</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enlaces sociales</CardTitle>
            <CardDescription>
              Actualiza contacto y redes del grupo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="mr-2 inline-block h-4 w-4" />
                Correo electrónico
              </Label>
              <Input
                id="email"
                name="email"
                disabled={pending}
                defaultValue={state.defaultValues.email}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">
                <SiWhatsapp className="mr-2 inline-block h-4 w-4" />
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                disabled={pending}
                defaultValue={state.defaultValues.whatsapp}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook">
                <SiFacebook className="mr-2 inline-block h-4 w-4" />
                Facebook
              </Label>
              <Input
                id="facebook"
                name="facebook"
                disabled={pending}
                defaultValue={state.defaultValues.facebook}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">
                <SiInstagram className="mr-2 inline-block h-4 w-4" />
                Instagram
              </Label>
              <Input
                id="instagram"
                name="instagram"
                disabled={pending}
                defaultValue={state.defaultValues.instagram}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button disabled={pending} type="submit">
          {pending ? (
            "Guardando..."
          ) : (
            <>
              <Save />
              Guardar cambios
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
