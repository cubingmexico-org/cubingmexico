"use client";

import { useEffect, useState } from "react";
import { format, formatDistance } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Progress } from "@workspace/ui/components/progress";
import { Separator } from "@workspace/ui/components/separator";
import {
  RefreshCw,
  Settings,
  Users,
  Calendar,
  MapPin,
  ChevronRight,
  Home,
  Check,
  X,
} from "lucide-react";
import type { Competition } from "@/types/wca";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ExtendedPerson } from "@/types/wcif";
import { Input } from "@workspace/ui/components/input";
import { FileUploader } from "./file-uploader";
import { WcaMonochrome } from "@workspace/icons";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Canvas } from "./canvas/canvas";
import { useCanvasStore } from "@/lib/canvas-store";
import type { State, Team } from "@/db/queries";
import { revalidateWCIF } from "@/app/actions";
import { Switch } from "@workspace/ui/components/switch";
import { ExportBadgesButtonGroup } from "./export-badges-button-group";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";

interface BadgeManagerProps {
  competition: Competition;
  persons: ExtendedPerson[];
  states: State[];
  teams: Team[];
}

export function BadgeManager({
  competition,
  persons,
  states,
  teams,
}: BadgeManagerProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const [selectedPersons, setSelectedPersons] = useState<ExtendedPerson[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [backFiles, setBackFiles] = useState<File[]>([]);

  const [search, setSearch] = useState("");

  const [showOnlyCompeting, setShowOnlyCompeting] = useState<boolean>(false);

  const { setBackgroundImage, setBackgroundImageBack, enableBackSide } =
    useCanvasStore();

  const isMobile = useIsMobile();

  useEffect(() => {
    if (files.length > 0) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImage(e.target?.result as string);
      };
      reader.readAsDataURL(files[0]!);
    } else {
      setBackgroundImage(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  useEffect(() => {
    if (backFiles.length > 0) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImageBack(e.target?.result as string);
      };
      reader.readAsDataURL(backFiles[0]!);
    } else {
      setBackgroundImageBack(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backFiles]);

  if (!competition) {
    notFound();
  }

  const [startYear, startMonth, startDay] = competition.start_date
    .split("-")
    .map(Number);
  const startDate = new Date(startYear!, startMonth! - 1, startDay);

  const [endYear, endMonth, endDay] = competition.end_date
    .split("-")
    .map(Number);
  const endDate = new Date(endYear!, endMonth! - 1, endDay);

  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const formattedDate = isSameDay
    ? format(startDate, "d 'de' MMMM 'de' yyyy", { locale: es })
    : `${format(startDate, "d 'de' MMM", { locale: es })} - ${format(endDate, "d 'de' MMM 'de' yyyy", { locale: es })}`;

  const removeAccents = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filteredPersons = persons
    .filter(
      (person) =>
        removeAccents(person.name.toLowerCase()).includes(
          removeAccents(search.toLowerCase()),
        ) &&
        // optional competing-only filter
        (!showOnlyCompeting || person.registration?.isCompeting === true),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const groupedPersons = (() => {
    const newcomers: ExtendedPerson[] = [];
    const delegates: ExtendedPerson[] = [];
    const organizers: ExtendedPerson[] = [];
    const volunteers: ExtendedPerson[] = [];
    const regulars: ExtendedPerson[] = [];

    for (const p of filteredPersons) {
      // prioritize delegate over organizer
      const isDelegate =
        p.roles?.includes("delegate") || p.roles?.includes("trainee-delegate");
      const isOrganizer = p.roles?.includes("organizer");
      const isVolunteer = p.roles?.find((r) => r.startsWith("staff-"));

      if (isDelegate) {
        delegates.push(p);
      } else if (isOrganizer) {
        organizers.push(p);
      } else if (isVolunteer) {
        volunteers.push(p);
      } else if (!p.wcaId) {
        newcomers.push(p);
        continue;
      } else {
        regulars.push(p);
      }
    }

    return { newcomers, delegates, organizers, volunteers, regulars };
  })();

  if (isMobile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Función no disponible en móvil
          </CardTitle>
          <CardDescription>
            El gestor de gafetes requiere una pantalla más grande
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta función está diseñada para ser utilizada en computadoras de
            escritorio o tabletas debido a la complejidad de la interfaz y las
            herramientas de diseño.
          </p>
          <p className="text-sm text-muted-foreground">
            Por favor, accede desde un dispositivo con una pantalla más grande
            para gestionar los gafetes de{" "}
            <span className="font-medium">{competition.name}</span>.
          </p>
          <Link
            href="/"
            className={buttonVariants({
              variant: "default",
              className: "w-full",
            })}
          >
            <Home />
            Volver al inicio
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Competencias</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink className="max-w-50 truncate">
              {competition.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink>Gafetes</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Gafetes: {competition.name}
        </h1>
        <p className="text-muted-foreground">
          Gestiona los gafetes para esta competencia.
        </p>
      </div>
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Competencia</CardTitle>
              <CardDescription>Detalles sobre la competencia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-2">
                <Link
                  href={`https://live.worldcubeassociation.org/link/competitions/${competition.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: "default",
                    size: "sm",
                    className: "gap-2",
                  })}
                >
                  <WcaMonochrome />
                  WCA Live
                </Link>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm">
                  {competition.city}, {competition.country_iso2}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm">{formattedDate}</span>
              </div>
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm">
                  {persons.length}/{competition.competitor_limit} competidores
                </span>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  Eventos ({competition.event_ids.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {competition.event_ids.map((eventId) => (
                    <span
                      className={`cubing-icon event-${eventId}`}
                      key={eventId}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Estado de los Gafetes</CardTitle>
              <CardDescription>
                Información sobre los gafetes generados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Gafetes de Participantes
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {persons.length} generados
                  </span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
              <div className="rounded-md bg-muted p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">
                      Última actualización
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {formatDistance(lastUpdate, new Date(), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 transition-all"
                    onClick={() => {
                      revalidateWCIF(competition.id);
                      setLastUpdate(new Date());
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Actualizar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Configuración
                </CardTitle>
                <CardDescription>
                  Selecciona los participantes para los que se generarán los
                  gafetes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Buscar participante"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                />
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">Participantes</h4>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="show-only-competing" className="text-xs">
                        Mostrar solo competidores
                      </Label>
                      <Switch
                        id="show-only-competing"
                        checked={showOnlyCompeting}
                        onCheckedChange={(v) =>
                          setShowOnlyCompeting(Boolean(v))
                        }
                      />
                    </div>
                  </div>
                  <ScrollArea
                    className="h-80 rounded-md border bg-muted/20 p-4"
                    type="always"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredPersons.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No se encontraron participantes
                        </p>
                      ) : (
                        <>
                          {[
                            {
                              key: "delegates",
                              title: "Delegados",
                              list: groupedPersons.delegates,
                            },
                            {
                              key: "organizers",
                              title: "Organizadores",
                              list: groupedPersons.organizers,
                            },
                            {
                              key: "volunteers",
                              title: "Voluntarios",
                              list: groupedPersons.volunteers,
                            },
                            {
                              key: "newcomers",
                              title: "Nuevos",
                              list: groupedPersons.newcomers,
                            },
                            {
                              key: "regulars",
                              title: "Competidores",
                              list: groupedPersons.regulars,
                            },
                          ].map(({ key, title, list }) =>
                            list.length > 0 ? (
                              <div key={key} className="col-span-full">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-xs font-medium">
                                    {title} ({list.length})
                                  </div>
                                  <div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="gap-1 transition-all"
                                      onClick={() => {
                                        setSelectedPersons((prev) => {
                                          const existingIds = new Set(
                                            prev.map((p) => p.registrantId),
                                          );
                                          const toAdd = list.filter(
                                            (p) =>
                                              !existingIds.has(p.registrantId),
                                          );
                                          return [...prev, ...toAdd];
                                        });
                                      }}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      <span className="text-xs">
                                        Seleccionar todo
                                      </span>
                                    </Button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                  {list.map((person) => {
                                    const isChecked = selectedPersons.some(
                                      (p) => p.wcaUserId === person.wcaUserId,
                                    );
                                    return (
                                      <div
                                        key={person.wcaUserId}
                                        className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent/50 transition-colors cursor-pointer"
                                        onClick={(e) => {
                                          // Only trigger if clicking the container, not the checkbox or label
                                          if (e.target === e.currentTarget) {
                                            const checked = !isChecked;
                                            if (checked) {
                                              setSelectedPersons((prev) =>
                                                prev.some(
                                                  (p) =>
                                                    p.registrantId ===
                                                    person.registrantId,
                                                )
                                                  ? prev
                                                  : [...prev, person],
                                              );
                                            } else {
                                              setSelectedPersons((prev) =>
                                                prev.filter(
                                                  (p) =>
                                                    p.registrantId !==
                                                    person.registrantId,
                                                ),
                                              );
                                            }
                                          }
                                        }}
                                      >
                                        <Checkbox
                                          id={String(person.wcaUserId)}
                                          checked={isChecked}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setSelectedPersons((prev) =>
                                                prev.some(
                                                  (p) =>
                                                    p.registrantId ===
                                                    person.registrantId,
                                                )
                                                  ? prev
                                                  : [...prev, person],
                                              );
                                            } else {
                                              setSelectedPersons((prev) =>
                                                prev.filter(
                                                  (p) =>
                                                    p.registrantId !==
                                                    person.registrantId,
                                                ),
                                              );
                                            }
                                          }}
                                        />
                                        <Label
                                          htmlFor={String(person.wcaUserId)}
                                          className="cursor-pointer flex-1"
                                        >
                                          <p className="text-xs truncate">
                                            {person.name}
                                          </p>
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null,
                          )}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <div className="flex flex-wrap justify-start gap-2 w-full">
                  <Button
                    aria-label="Seleccionar todos"
                    disabled={selectedPersons.length === persons.length}
                    onClick={() => {
                      setSelectedPersons(persons);
                    }}
                    variant="ghost"
                    className="gap-2 transition-all"
                  >
                    <Check />
                    Seleccionar todos
                  </Button>
                  {selectedPersons.length > 0 && (
                    <Button
                      aria-label="Borrar selección"
                      onClick={() => {
                        setSelectedPersons([]);
                      }}
                      variant="ghost"
                      className="gap-2 transition-all"
                    >
                      <X />
                      Borrar selección
                    </Button>
                  )}
                </div>
                {selectedPersons.length === 0 && (
                  <p className="text-sm font-semibold text-destructive py-2">
                    Ningún competidor seleccionado. Se exportarán gafetes en
                    blanco.
                  </p>
                )}
                <div className="flex justify-end gap-2 w-full">
                  <ExportBadgesButtonGroup
                    selectedPersons={selectedPersons}
                    competition={competition}
                    states={states}
                    teams={teams}
                  />
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {enableBackSide ? "Fondos del Gafete" : "Fondo del Gafete"}
                </CardTitle>
                <CardDescription>
                  {enableBackSide
                    ? "Sube las imágenes de fondo para el anverso y reverso del gafete."
                    : "Sube una imagen de fondo para el gafete."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {enableBackSide && <Label>Fondo Anverso</Label>}
                <FileUploader files={files} setFiles={setFiles} />
                {enableBackSide && (
                  <>
                    <Label>Fondo Reverso</Label>
                    <FileUploader files={backFiles} setFiles={setBackFiles} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Canvas
            states={states}
            teams={teams}
            eventIds={competition.event_ids}
          />
        </div>
      </div>
    </div>
  );
}
