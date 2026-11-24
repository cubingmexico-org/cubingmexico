"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";
import type { GroupKind } from "@workspace/db/schema";
import { TransparentImagePreview } from "@/components/transparent-image-preview";
import { groupHref, groupKindLabel } from "@/lib/groups";
import {
  deleteGroupAction,
  deleteGroupCoverAction,
  deleteGroupIconAction,
  deleteGroupLogoAction,
  setSponsorshipAction,
} from "../_lib/actions";
import type { GroupMember } from "../_types";
import { AddGroupMemberForm } from "./add-group-member-form";
import { GroupCoverUploader } from "./group-cover-uploader";
import { GroupIconUploader } from "./group-icon-uploader";
import { GroupImageUploader } from "./group-image-uploader";
import { SaveGroupForm } from "./save-group-form";

type GroupData = {
  id: string;
  kind: GroupKind;
  name: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  coverImage: string | null;
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
  members: GroupMember[];
  canManageRoles: boolean;
  isSuperadmin: boolean;
}) {
  const href = groupHref(group.kind, group.id);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="border-b bg-muted/75">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Link
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                  )}
                  href={href}
                  prefetch={false}
                >
                  <ArrowLeft />
                  Volver al {groupKindLabel(group.kind)}
                </Link>
              </div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Gestionar {groupKindLabel(group.kind)}: {group.name}
              </h1>
              <p className="mt-1 text-muted-foreground">
                Actualiza la información del grupo, gestiona miembros y más
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs className="w-full" defaultValue="general">
          <div className="overflow-x-auto pb-2">
            <TabsList className="mb-6 w-full justify-start md:w-auto">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="members">Miembros</TabsTrigger>
              <TabsTrigger value="images">Imágenes</TabsTrigger>
              {isSuperadmin && group.kind === "sponsor" ? (
                <TabsTrigger value="sponsorship">Patrocinio</TabsTrigger>
              ) : null}
              {isSuperadmin ? (
                <TabsTrigger value="danger">Zona de peligro</TabsTrigger>
              ) : null}
            </TabsList>
          </div>

          <TabsContent value="general">
            <SaveGroupForm group={group} />
          </TabsContent>

          <TabsContent value="members">
            <AddGroupMemberForm
              groupId={group.id}
              groupKind={group.kind}
              members={members}
              canManageRoles={canManageRoles}
            />
          </TabsContent>

          <TabsContent value="images">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Logo del grupo</CardTitle>
                  <CardDescription>
                    Imagen completa para encabezados y tarjetas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative h-40 w-40">
                      <Image
                        src={group.image || "/placeholder.svg"}
                        alt="Logo del grupo"
                        className="h-full w-full rounded-full border-2 border-gray-200 object-cover"
                        fill
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                        <GroupImageUploader groupId={group.id} />
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    Tamaño recomendado: 400x400 píxeles (cuadrado)
                  </div>
                  <div className="flex justify-center pt-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          type="button"
                          disabled={!group.image}
                        >
                          <Trash2 />
                          Eliminar logo
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ¿Estás completamente seguro?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará el logo del grupo. No podrás
                            deshacer esta acción.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              startTransition(async () => {
                                await deleteGroupLogoAction(group.id);
                                toast.success("Logo eliminado");
                              })
                            }
                          >
                            Continuar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ícono del grupo</CardTitle>
                  <CardDescription>
                    Versión simplificada para badges y tamaños pequeños
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative h-24 w-24">
                      <TransparentImagePreview
                        src={group.icon}
                        alt="Ícono del grupo"
                        className="h-full w-full border-2 border-gray-200"
                        emptyLabel="Sin ícono"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                        <GroupIconUploader groupId={group.id} />
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    Se sube como PNG transparente (fondo eliminado
                    automáticamente)
                  </div>
                  <div className="flex justify-center pt-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          type="button"
                          disabled={!group.icon}
                        >
                          <Trash2 />
                          Eliminar ícono
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ¿Estás completamente seguro?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará el ícono del grupo. Si no hay
                            ícono, se usará el logo como respaldo.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              startTransition(async () => {
                                await deleteGroupIconAction(group.id);
                                toast.success("Ícono eliminado");
                              })
                            }
                          >
                            Continuar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Imagen de portada</CardTitle>
                  <CardDescription>
                    Sube la imagen de portada del grupo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative h-48 w-full overflow-hidden rounded-md border border-gray-200">
                    <Image
                      src={group.coverImage || "/placeholder.svg"}
                      alt="Portada del grupo"
                      className="h-full w-full object-cover"
                      fill
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                      <GroupCoverUploader groupId={group.id} />
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    Tamaño recomendado: 1200x400 píxeles (relación 3:1)
                  </div>
                  <div className="flex justify-center pt-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          className="text-red-500 hover:text-red-700"
                          disabled={!group.coverImage}
                        >
                          <Trash2 />
                          Eliminar portada
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ¿Estás completamente seguro?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará la portada del grupo. No
                            podrás deshacer esta acción.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              startTransition(async () => {
                                await deleteGroupCoverAction(group.id);
                                toast.success("Portada eliminada");
                              })
                            }
                          >
                            Continuar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Guías de imágenes</CardTitle>
                  <CardDescription>
                    Mejores prácticas para imágenes del grupo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <h3 className="flex items-center font-semibold">
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Guías para el logo
                      </h3>
                      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        <li>Para encabezados y tarjetas</li>
                        <li>Usa una imagen cuadrada (proporción 1:1)</li>
                        <li>Manténlo simple y reconocible</li>
                        <li>Usa formato PNG para mejor calidad</li>
                        <li>Tamaño máximo del archivo: 2MB</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h3 className="flex items-center font-semibold">
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Guías para el ícono
                      </h3>
                      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        <li>Para badges (~14px) y chips pequeños</li>
                        <li>Marca simplificada, poco o nada de texto</li>
                        <li>Alto contraste; legible en tamaño diminuto</li>
                        <li>PNG transparente (fondo se elimina al subir)</li>
                        <li>Tamaño máximo del archivo: 1MB</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h3 className="flex items-center font-semibold">
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Guías para la imagen de portada
                      </h3>
                      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        <li>
                          Usa una imagen ancha (proporción recomendada 3:1)
                        </li>
                        <li>Elige imágenes de alta resolución</li>
                        <li>Evita texto en la imagen</li>
                        <li>Usa formato JPG para fotos</li>
                        <li>Tamaño máximo del archivo: 4MB</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {isSuperadmin && group.kind === "sponsor" ? (
            <TabsContent value="sponsorship">
              <Card>
                <CardHeader>
                  <CardTitle>Patrocinio</CardTitle>
                  <CardDescription>
                    Estado actual: {group.sponsorshipStatus}
                    {group.publicityEnabled ? " · publicidad activa" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
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
                </CardContent>
              </Card>
            </TabsContent>
          ) : null}

          {isSuperadmin ? (
            <TabsContent value="danger">
              <Card className="border-destructive/40">
                <CardHeader>
                  <CardTitle className="text-destructive">
                    Eliminar {groupKindLabel(group.kind).toLowerCase()}
                  </CardTitle>
                  <CardDescription>
                    Esto borra permanentemente el grupo, su roster, rankings y
                    récords. No se puede deshacer. Preferible desactivar el
                    grupo desde General si solo quieres ocultarlo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        type="button"
                        disabled={pending}
                      >
                        <Trash2 />
                        Eliminar permanentemente
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ¿Eliminar «{group.name}»?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Se borrará el grupo y todos sus datos asociados. Esta
                          acción es irreversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() =>
                            startTransition(async () => {
                              await deleteGroupAction(group.id);
                            })
                          }
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </>
  );
}
