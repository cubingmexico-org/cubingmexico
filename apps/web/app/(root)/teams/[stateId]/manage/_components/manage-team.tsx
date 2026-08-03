"use client";

import React from "react";
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
import { Trash2, ArrowLeft, ImageIcon } from "lucide-react";
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
import Image from "next/image";
import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";
import { deleteTeamCoverAction, deleteTeamLogoAction } from "@/app/actions";
import { ImageUploader } from "./image-uploader";
import { CoverUploader } from "./cover-uploader";
import { getMembers, getMembersGenderCounts } from "../../_lib/queries";
import { SaveTeamForm } from "./save-team-form";
import { AddMemberForm } from "./add-member-form";

export function ManageTeam({
  stateId,
  teamData,
  promises,
  canManageRoles,
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
  promises: Promise<
    [
      Awaited<ReturnType<typeof getMembers>>,
      Awaited<ReturnType<typeof getMembersGenderCounts>>,
    ]
  >;
  canManageRoles: boolean;
}) {
  return (
    <>
      <div className="bg-muted/75 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                  )}
                  href={`/teams/${stateId}`}
                >
                  <ArrowLeft />
                  Volver al Team
                </Link>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Gestionar Team: {teamData.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                Actualiza la información del Team, gestiona miembros y más
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs className="w-full" defaultValue="general">
          <div className="overflow-x-auto pb-2">
            <TabsList className="w-full md:w-auto justify-start mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="members">Miembros</TabsTrigger>
              {/* <TabsTrigger value="achievements">Logros</TabsTrigger> */}
              <TabsTrigger value="images">Imágenes</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="general">
            <SaveTeamForm stateId={stateId} teamData={teamData} />
          </TabsContent>

          <TabsContent value="members">
            <AddMemberForm
              stateId={stateId}
              promises={promises}
              canManageRoles={canManageRoles}
            />
          </TabsContent>

          {/* <TabsContent value="achievements">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Logros del Team</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" type="button" disabled>
                        <Plus />
                        Añadir Logro
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Añadir Logro</DialogTitle>
                        <DialogDescription>
                          Añade un nuevo logro al perfil de tu team
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="achievement-title">Título</Label>
                          <Input
                            id="achievement-title"
                            placeholder="ej. Campeonato Nacional"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="achievement-description">
                            Descripción
                          </Label>
                          <Textarea
                            id="achievement-description"
                            placeholder="Describe el logro"
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="achievement-date">Fecha</Label>
                            <Input id="achievement-date" type="date" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="achievement-type">Tipo</Label>
                            <Select defaultValue="competition">
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="competition">
                                  Competencia
                                </SelectItem>
                                <SelectItem value="record">Récord</SelectItem>
                                <SelectItem value="milestone">Hito</SelectItem>
                                <SelectItem value="other">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button">Añadir Logro</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Consejos para Logros</CardTitle>
                  <CardDescription>
                    Mejores prácticas para mostrar los logros del team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Sé Específico</h3>
                    <p className="text-sm text-muted-foreground">
                      Incluye detalles específicos como nombres de
                      competiciones, fechas y ubicaciones.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">
                      Destaca los Esfuerzos del Team
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Enfócate en los logros del team en lugar de los logros
                      individuales.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">
                      Usa un Formato Consistente
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Mantén las descripciones de los logros consistentes en
                      estilo y longitud.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Incluye Contenido Visual</h3>
                    <p className="text-sm text-muted-foreground">
                      Considera agregar fotos de eventos para hacer los logros
                      más atractivos.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent> */}

          <TabsContent value="images">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Logo del Team</CardTitle>
                  <CardDescription>
                    Sube la imagen del logo de tu team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative w-40 h-40">
                      <Image
                        src={teamData.image || "/placeholder.svg"}
                        alt="Logo del team"
                        className="w-full h-full object-cover rounded-full border-2 border-gray-200"
                        layout="fill"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                        <ImageUploader stateId={stateId} />
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
                          disabled={!teamData.image}
                        >
                          <Trash2 />
                          Eliminar Logo
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ¿Estás completamente seguro?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará el logo de tu team. No podrás
                            deshacer esta acción.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await deleteTeamLogoAction(stateId);
                            }}
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
                  <CardTitle>Imagen de Portada</CardTitle>
                  <CardDescription>
                    Sube la imagen de portada de tu team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative h-48 w-full overflow-hidden rounded-md border border-gray-200">
                    <Image
                      src={teamData.coverImage || "/placeholder.svg"}
                      alt="Portada del team"
                      className="w-full h-full object-cover"
                      layout="fill"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                      <CoverUploader stateId={stateId} />
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
                          disabled={!teamData.coverImage}
                        >
                          <Trash2 />
                          Eliminar Portada
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ¿Estás completamente seguro?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará el logo de tu team. No podrás
                            deshacer esta acción.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await deleteTeamCoverAction(stateId);
                            }}
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
                  <CardTitle>Guías de Imágenes</CardTitle>
                  <CardDescription>
                    Mejores prácticas para imágenes de team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold flex items-center">
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Guías para el Logo
                        </h3>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li>Usa una imagen cuadrada (proporción 1:1)</li>
                          <li>Manténlo simple y reconocible</li>
                          <li>
                            Asegúrate de que se vea bien en tamaños pequeños
                          </li>
                          <li>Usa formato PNG para mejor calidad</li>
                          <li>Tamaño máximo del archivo: 2MB</li>
                        </ul>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold flex items-center">
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Guías para la Imagen de Portada
                        </h3>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
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
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
