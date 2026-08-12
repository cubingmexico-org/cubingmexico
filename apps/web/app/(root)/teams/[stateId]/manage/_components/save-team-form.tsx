"use client";

import React from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { Mail, Save, Check, X } from "lucide-react";
import { Switch } from "@workspace/ui/components/switch";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { teamFormAction } from "@/app/actions";
import { useActionState } from "react";
import { SiFacebook, SiInstagram, SiWhatsapp } from "@icons-pack/react-simple-icons";

export function SaveTeamForm({
  stateId,
  teamData,
}: {
  stateId: string;
  teamData: {
    name: string;
    description: string | null;
    image: string | null;
    coverImage: string | null;
    state: string;
    founded: Date | null;
    socialLinks: {
      email?: string;
      whatsapp?: string;
      facebook?: string;
      instagram?: string;
      twitter?: string;
      tiktok?: string;
    } | null;
    isActive: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(teamFormAction, {
    defaultValues: {
      name: teamData.name,
      description: teamData.description,
      email: teamData.socialLinks?.email,
      whatsapp: teamData.socialLinks?.whatsapp,
      facebook: teamData.socialLinks?.facebook,
      instagram: teamData.socialLinks?.instagram,
      twitter: teamData.socialLinks?.twitter,
      tiktok: teamData.socialLinks?.tiktok,
      founded: teamData.founded
        ? teamData.founded.toISOString().split("T")[0]
        : "",
      isActive: teamData.isActive ? "on" : undefined,
    },
    success: false,
    errors: null,
  });

  return (
    <form action={formAction}>
      <input type="hidden" name="stateId" defaultValue={stateId} readOnly />

      {state.success ? (
        <div className="container mx-auto px-4 py-3">
          <Alert className="bg-green-50 border-green-500">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Éxito</AlertTitle>
            <AlertDescription className="text-green-700">
              Los cambios se han guardado correctamente.
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-3">
          {state.errors && (
            <Alert className="bg-red-50 border-red-500">
              <X className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Error</AlertTitle>
              <AlertDescription className="text-red-700">
                {Object.values(state.errors).join(", ")}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información del Team</CardTitle>
            <CardDescription>
              Actualiza la información básica de tu Team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="group/field grid gap-2"
              data-invalid={!!state.errors}
            >
              <Label
                htmlFor="name"
                className="group-data-[invalid=true]/field:text-destructive"
              >
                Nombre <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Nombre del Team"
                className="group-data-[invalid=true]/field:border-destructive focus-visible:group-data-[invalid=true]/field:ring-destructive"
                disabled={pending}
                aria-invalid={!!state.errors}
                aria-errormessage="error-name"
                defaultValue={state.defaultValues.name}
              />
              {state.errors && (
                <p id="error-name" className="text-destructive text-sm">
                  {state.errors}
                </p>
              )}
            </div>
            <div className="group/field grid gap-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                name="state"
                defaultValue={teamData.state}
                readOnly
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="founded">Fecha de fundación</Label>
              <Input
                id="founded"
                name="founded"
                defaultValue={state.defaultValues.founded}
                type="date"
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div
              className="group/field grid gap-2"
              data-invalid={!!state.errors}
            >
              <Label
                htmlFor="description"
                className="group-data-[invalid=true]/field:text-destructive"
              >
                Descripción
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Descripción"
                className="group-data-[invalid=true]/field:border-destructive focus-visible:group-data-[invalid=true]/field:ring-destructive"
                disabled={pending}
                aria-invalid={!!state.errors}
                aria-errormessage="error-description"
                defaultValue={state.defaultValues.description || ""}
                rows={5}
              />
              {state.errors && (
                <p id="error-description" className="text-destructive text-sm">
                  {state.errors}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={state.defaultValues.isActive ? true : false}
                disabled={pending}
              />
              <Label htmlFor="isActive">El Team está activo</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enlaces Sociales</CardTitle>
            <CardDescription>
              Actualiza la información de contacto y redes sociales del Team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="group/field grid gap-2"
              data-invalid={!!state.errors}
            >
              <Label
                htmlFor="email"
                className="group-data-[invalid=true]/field:text-destructive"
              >
                <Mail className="h-4 w-4 inline-block mr-2" />
                Correo Electrónico
              </Label>
              <Input
                id="email"
                name="email"
                placeholder="team@ejemplo.com"
                className="group-data-[invalid=true]/field:border-destructive focus-visible:group-data-[invalid=true]/field:ring-destructive"
                disabled={pending}
                aria-invalid={!!state.errors}
                aria-errormessage="error-email"
                defaultValue={state.defaultValues.email}
              />
              {state.errors && (
                <p id="error-email" className="text-destructive text-sm">
                  {state.errors}
                </p>
              )}
            </div>
            <div
              className="group/field grid gap-2"
              data-invalid={!!state.errors}
            >
              <Label
                htmlFor="whatsapp"
                className="group-data-[invalid=true]/field:text-destructive"
              >
                <SiWhatsapp className="h-4 w-4 inline-block mr-2" />
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                placeholder="+52 55 1234 5678"
                className="group-data-[invalid=true]/field:border-destructive focus-visible:group-data-[invalid=true]/field:ring-destructive"
                disabled={pending}
                aria-invalid={!!state.errors}
                aria-errormessage="error-whatsapp"
                defaultValue={state.defaultValues.whatsapp}
              />
              {state.errors && (
                <p id="error-whatsapp" className="text-destructive text-sm">
                  {state.errors}
                </p>
              )}
            </div>
            <div
              className="group/field grid gap-2"
              data-invalid={!!state.errors}
            >
              <Label
                htmlFor="facebook"
                className="group-data-[invalid=true]/field:text-destructive"
              >
                <SiFacebook className="h-4 w-4 inline-block mr-2" />
                Facebook
              </Label>
              <Input
                id="facebook"
                name="facebook"
                placeholder="tu.team"
                className="group-data-[invalid=true]/field:border-destructive focus-visible:group-data-[invalid=true]/field:ring-destructive"
                disabled={pending}
                aria-invalid={!!state.errors}
                aria-errormessage="error-facebook"
                defaultValue={state.defaultValues.facebook}
              />
              {state.errors && (
                <p id="error-facebook" className="text-destructive text-sm">
                  {state.errors}
                </p>
              )}
            </div>
            <div
              className="group/field grid gap-2"
              data-invalid={!!state.errors}
            >
              <Label
                htmlFor="instagram"
                className="group-data-[invalid=true]/field:text-destructive"
              >
                <SiInstagram className="h-4 w-4 inline-block mr-2" />
                Instagram
              </Label>
              <Input
                id="instagram"
                name="instagram"
                placeholder="@tu.team"
                className="group-data-[invalid=true]/field:border-destructive focus-visible:group-data-[invalid=true]/field:ring-destructive"
                disabled={pending}
                aria-invalid={!!state.errors}
                aria-errormessage="error-instagram"
                defaultValue={state.defaultValues.instagram}
              />
              {state.errors && (
                <p id="error-instagram" className="text-destructive text-sm">
                  {state.errors}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end mt-6">
        <Button disabled={pending} type="submit">
          {pending ? (
            <>Guardando...</>
          ) : (
            <>
              <Save />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
