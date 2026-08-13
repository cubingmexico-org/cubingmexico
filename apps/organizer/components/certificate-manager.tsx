"use client";

import { useEffect, useState } from "react";
import { format, formatDistance } from "date-fns";
import { es } from "date-fns/locale";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
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
  Award,
  FileText,
  RefreshCw,
  Settings,
  Eye,
  Users,
  Calendar,
  MapPin,
  ChevronRight,
  Home,
  Check,
  X,
  Download,
  Search,
  XCircle,
} from "lucide-react";
import { Competition } from "@/types/wca";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import Link from "next/link";
import useSWR from "swr";
import { notFound } from "next/navigation";
import {
  fetcher,
  formatDates,
  formatEvents,
  formatPlace,
  formatResults,
  formatResultType,
  joinPersons,
  transformString,
} from "@/lib/utils";
import type { ParticipantData, RegisteredPerson, PodiumData } from "@/types/wcif";
import Tiptap from "./editor/tiptap";
import { participation, podium } from "@/data/certificates";
import { JSONContent } from "@tiptap/react";
import {
  Margins,
  PageOrientation,
  PageSize,
  TDocumentDefinitions,
} from "pdfmake/interfaces";
import { fontDeclarations } from "@/lib/fonts";
import * as pdfMake from "pdfmake/build/pdfmake";
import { CertificateManagerSkeleton } from "./certificate-manager-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Input } from "@workspace/ui/components/input";
import { FileUploader } from "./file-uploader";
import { WcaMonochrome } from "@workspace/icons";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { toast } from "sonner";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { Switch } from "@workspace/ui/components/switch";
import { Slider } from "@workspace/ui/components/slider";
import Papa from "papaparse";

export function CertificateManager({
  competition,
  persons,
}: {
  competition: Competition;
  persons: RegisteredPerson[];
}) {
  const [activeTab, setActiveTab] = useState<"podium" | "participation">(
    "podium",
  );
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const [selectedPodiums, setSelectedPodiums] = useState<PodiumData[]>([]);
  const [selectedParticipants, setSelctedParticipants] = useState<
    ParticipantData[]
  >([]);

  const [content, setContent] = useState<JSONContent>(podium);
  const [participantsContent, setParticipantsContent] =
    useState<JSONContent>(participation);

  const [pageMargins, setPageMargins] = useState<Margins>([40, 60, 40, 60]);
  const [pageMarginsParticipants, setPageMarginsParticipants] =
    useState<Margins>([40, 60, 40, 60]);

  const [pageOrientation, setPageOrientation] =
    useState<PageOrientation>("landscape");
  const [pageOrientationParticipants, setPageOrientationParticipants] =
    useState<PageOrientation>("portrait");

  const [pageSize, setPageSize] = useState<PageSize>("LETTER");
  const [pageSizeParticipants, setPageSizeParticipants] =
    useState<PageSize>("LETTER");

  const [files, setFiles] = useState<File[]>([]);
  const [filesParticipants, setFilesParticipants] = useState<File[]>([]);

  const [background, setBackground] = useState<string>();
  const [backgroundParticipants, setBackgroundParticipants] =
    useState<string>();

  const [selectedTemplate, setSelectedTemplate] = useState<
    "general" | "female" | "newcomer" | "age"
  >("general");
  const [searchParticipant, setSearchParticipant] = useState("");

  const [filterByCountry, setFilterByCountry] = useState(false);

  // Age filter states
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const [birthdateMap, setBirthdateMap] = useState<Map<number, string>>();
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 100]);
  const [tempAgeRange, setTempAgeRange] = useState<[number, number]>([0, 100]);
  const [csvError, setCsvError] = useState<string>();

  const isMobile = useIsMobile();

  useEffect(() => {
    if (files.length > 0) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackground(e.target?.result as string);
      };
      reader.readAsDataURL(files[0]!);
    } else {
      setBackground(undefined);
    }
  }, [files]);

  useEffect(() => {
    if (filesParticipants.length > 0) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundParticipants(e.target?.result as string);
      };
      reader.readAsDataURL(filesParticipants[0]!);
    } else {
      setBackgroundParticipants(undefined);
    }
  }, [filesParticipants]);

  useEffect(() => {
    // Clear selected podiums when filter changes to prevent showing outdated selections
    setSelectedPodiums([]);

    // Clear age-related state when switching away from age template
    if (selectedTemplate !== "age") {
      setCsvFiles([]);
      setBirthdateMap(undefined);
      setAgeRange([0, 100]);
      setTempAgeRange([0, 100]);
      setCsvError(undefined);
    }
  }, [filterByCountry, selectedTemplate]);

  // CSV parsing for age filter
  useEffect(() => {
    if (csvFiles.length > 0) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const map = new Map<number, string>();
              let validCount = 0;

              // Try different column name variations
              const data = results.data as Array<Record<string, string>>;

              for (const row of data) {
                // Support multiple column name formats
                const registrantId =
                  row["Registrant Id"] ||
                  row["registrantId"] ||
                  row["registrant_id"];
                const birthdate =
                  row["Birth Date"] || row["birthdate"] || row["Birthdate"];

                if (registrantId && birthdate) {
                  // Validate date format (YYYY-MM-DD)
                  if (/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
                    const id = parseInt(registrantId);
                    if (!isNaN(id)) {
                      map.set(id, birthdate.trim());
                      validCount++;
                    }
                  }
                }
              }

              if (validCount === 0) {
                setCsvError("No se encontraron datos válidos en el CSV");
                toast.error("CSV inválido", {
                  description:
                    "Asegúrate de que el archivo tenga columnas 'Registrant Id' y 'Birth Date' con formato YYYY-MM-DD",
                });
                setBirthdateMap(undefined);
              } else {
                setBirthdateMap(map);
                setCsvError(undefined);
                toast.success("CSV cargado", {
                  description: `${validCount} competidor${validCount !== 1 ? "es" : ""} con fecha de nacimiento`,
                });
              }
            } catch (error) {
              setCsvError("Error al procesar el CSV");
              toast.error("Error al procesar el CSV", {
                description:
                  error instanceof Error ? error.message : "Error desconocido",
              });
              setBirthdateMap(undefined);
            }
          },
          error: (error: Error) => {
            setCsvError("Error al leer el CSV");
            toast.error("Error al leer el CSV", {
              description: error.message,
            });
            setBirthdateMap(undefined);
          },
        });
      };
      reader.readAsText(csvFiles[0]!);
    } else {
      setBirthdateMap(undefined);
      setCsvError(undefined);
    }
  }, [csvFiles]);

  const {
    data: participantsData,
    isLoading: isLoadingParticipants,
    mutate: mutateParticipants,
  } = useSWR<ParticipantData[]>(
    `/api/certificates/participation?competitionId=${competition.id}`,
    fetcher,
    {
      fallbackData: [],
    },
  );

  // Build podium API URL with age parameters when needed
  const buildPodiumUrl = () => {
    let url = `/api/certificates/podium?competitionId=${competition.id}&filterByCountry=${filterByCountry}&country=${competition.country_iso2}&template=${selectedTemplate}`;

    if (selectedTemplate === "age" && birthdateMap && birthdateMap.size > 0) {
      url += `&minAge=${ageRange[0]}&maxAge=${ageRange[1]}`;
      url += `&birthdates=${encodeURIComponent(JSON.stringify(Array.from(birthdateMap.entries())))}`;
    }

    return url;
  };

  const {
    data: podiumsData,
    isLoading: isLoadingPodiums,
    mutate: mutatePodiums,
  } = useSWR<PodiumData[]>(buildPodiumUrl(), fetcher, {
    fallbackData: [],
  });

  if (isMobile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Función no disponible en móvil
          </CardTitle>
          <CardDescription>
            El gestor de certificados requiere una pantalla más grande
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
            para gestionar los certificados de{" "}
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

  if (isLoadingParticipants || isLoadingPodiums) {
    return <CertificateManagerSkeleton />;
  }

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

  const renderTextContent = (
    content: JSONContent["content"],
    data: PodiumData,
  ) => {
    return content
      ?.map((contentItem) => {
        const bold = contentItem.marks?.some((mark) => mark.type === "bold");
        const font =
          contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.fontFamily || "Roboto";
        const fontSize =
          contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.fontSize || "12pt";
        const color =
          contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.color || "#000000";
        const transform =
          (contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.transform as
            | "lowercase"
            | "capitalize"
            | "uppercase"
            | "none"
            | undefined) || "none";

        const textObject = (text: string | undefined) => ({
          text,
          bold,
          font,
          fontSize: parseInt(fontSize as string) * 1.039,
          color,
        });

        switch (contentItem.type) {
          case "text":
            return textObject(
              transformString(contentItem.text || "", transform),
            );
          case "mention":
            switch (contentItem.attrs?.id) {
              case "Delegados":
                return textObject(
                  transformString(
                    joinPersons(competition.delegates.flatMap((d) => d.name)),
                    transform,
                  ),
                );
              case "Organizadores":
                return textObject(
                  transformString(
                    joinPersons(competition.organizers.flatMap((o) => o.name)),
                    transform,
                  ),
                );
              case "Posición (cardinal)":
                return textObject(
                  transformString(
                    formatPlace(data.place, "cardinal"),
                    transform,
                  ),
                );
              case "Posición (ordinal)":
                return textObject(
                  transformString(
                    formatPlace(data.place, "ordinal"),
                    transform,
                  ),
                );
              case "Posición (ordinal con texto)":
                return textObject(
                  transformString(
                    formatPlace(data.place, "ordinal_text"),
                    transform,
                  ),
                );
              case "Medalla":
                return textObject(
                  transformString(formatPlace(data.place, "medal"), transform),
                );
              case "Competidor":
                return textObject(transformString(data.name, transform));
              case "Evento":
                return textObject(
                  transformString(formatEvents(data.event), transform),
                );
              case "Resultado":
                return textObject(
                  transformString(
                    formatResults(data.result, data.event),
                    transform,
                  ),
                );
              case "Tipo de resultado":
                return textObject(
                  transformString(formatResultType(data.event), transform),
                );
              case "Competencia":
                return textObject(transformString(competition.name, transform));
              case "Fecha":
                return textObject(
                  transformString(formatDates(startDate, endDate), transform),
                );
              case "Ciudad":
                return textObject(transformString(competition.city, transform));
              default:
                return null;
            }
          default:
            return null;
        }
      })
      .filter(Boolean);
  };

  const renderParticipantTextContent = (
    content: JSONContent["content"],
    data: ParticipantData,
  ) => {
    return content
      ?.map((contentItem) => {
        const bold = contentItem.marks?.some((mark) => mark.type === "bold");
        const font =
          contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.fontFamily || "Roboto";
        const fontSize =
          contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.fontSize || "12pt";
        const color =
          contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.color || "#000000";
        const transform =
          (contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.transform as
            | "lowercase"
            | "capitalize"
            | "uppercase"
            | "none"
            | undefined) || "none";

        const textObject = (text: string | undefined) => ({
          text,
          bold,
          font,
          fontSize: parseInt(fontSize as string) * 1.039,
          color,
        });

        switch (contentItem.type) {
          case "text":
            return textObject(
              transformString(contentItem.text || "", transform),
            );
          case "mention":
            switch (contentItem.attrs?.id) {
              case "Delegados":
                return textObject(
                  transformString(
                    joinPersons(competition.delegates.flatMap((d) => d.name)),
                    transform,
                  ),
                );
              case "Organizadores":
                return textObject(
                  transformString(
                    joinPersons(competition.organizers.flatMap((o) => o.name)),
                    transform,
                  ),
                );
              case "Competidor":
                return textObject(transformString(data.name, transform));
              case "Competencia":
                return textObject(transformString(competition.name, transform));
              case "Fecha":
                return textObject(
                  transformString(formatDates(startDate, endDate), transform),
                );
              case "Ciudad":
                return textObject(transformString(competition.city, transform));
              default:
                return null;
            }
          default:
            return null;
        }
      })
      .filter(Boolean);
  };

  const renderDocumentContent = (content: JSONContent, data: PodiumData) => {
    return content.content
      ?.map((item) => {
        const alignment = item.attrs?.textAlign || "left";
        const text =
          item.content && item.content.length > 0
            ? renderTextContent(item.content, data)
            : "\u00A0";
        switch (item.type) {
          case "paragraph":
            return {
              text,
              style: "paragraph",
              alignment,
            };
          case "heading":
            return {
              text,
              style: `header${item.attrs?.level}`,
              alignment,
            };
          default:
            return null;
        }
      })
      .filter(Boolean);
  };

  const renderParticipantDocumentContent = (
    content: JSONContent,
    data: ParticipantData,
  ): unknown => {
    return content.content
      ?.map((item) => {
        const text =
          item.content && item.content.length > 0
            ? renderParticipantTextContent(item.content, data)
            : "\u00A0";
        const alignment = item.attrs?.textAlign || "left";
        switch (item.type) {
          case "paragraph":
            return {
              text,
              style: "paragraph",
              alignment,
            };
          case "heading":
            return {
              text,
              style: `header${item.attrs?.level}`,
              alignment,
            };
          case "table":
            return {
              columns: [
                { width: "*", text: "" },
                {
                  table: {
                    headerRows: 1,
                    // widths: item.attrs?.widths,
                    body: [
                      ...(item.content || [])
                        .map((row) => {
                          const headerCells =
                            row.content?.filter(
                              (cell) => cell.type === "tableHeader",
                            ) || [];
                          if (row.type === "tableRow") {
                            if (headerCells.length === 0) {
                              return null;
                            }
                            return headerCells.map((cell) =>
                              cell.content?.map((contentCell) =>
                                renderParticipantDocumentContent(
                                  { content: [contentCell] },
                                  data,
                                ),
                              ),
                            );
                          }
                          return null;
                        })
                        .filter(Boolean),
                      ...(item.content?.some((row) =>
                        row.content?.some((cell) => cell.type === "tableCell"),
                      )
                        ? data.results.map((result) => {
                            const cell = item.content?.find((row) =>
                              row.content?.some(
                                (cell) => cell.type === "tableCell",
                              ),
                            );

                            let event;
                            let average;
                            let ranking;

                            for (const row of cell?.content || []) {
                              for (const cell of row.content || []) {
                                if (
                                  cell.content?.some(
                                    (content) => content.type === "mention",
                                  )
                                ) {
                                  switch (cell.content[0]?.attrs?.id) {
                                    case "Evento (tabla)":
                                    case "Event (table)":
                                      event = renderParticipantDocumentContent(
                                        {
                                          content: [
                                            {
                                              type: "paragraph",
                                              attrs: cell.attrs,
                                              content: [
                                                {
                                                  type: "text",
                                                  text: formatEvents(
                                                    result.event,
                                                  ),
                                                  marks: cell.content[0].marks,
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                        data,
                                      );
                                      break;
                                    case "Resultado (tabla)":
                                    case "Result (table)":
                                      average =
                                        renderParticipantDocumentContent(
                                          {
                                            content: [
                                              {
                                                type: "paragraph",
                                                attrs: cell.attrs,
                                                content: [
                                                  {
                                                    type: "text",
                                                    text: formatResults(
                                                      result.average,
                                                      result.event,
                                                    ),
                                                    marks:
                                                      cell.content[0].marks,
                                                  },
                                                ],
                                              },
                                            ],
                                          },
                                          data,
                                        );
                                      break;
                                    case "Posición (tabla)":
                                    case "Ranking (table)":
                                      ranking =
                                        renderParticipantDocumentContent(
                                          {
                                            content: [
                                              {
                                                type: "paragraph",
                                                attrs: cell.attrs,
                                                content: [
                                                  {
                                                    type: "text",
                                                    text: (
                                                      result.ranking || ""
                                                    ).toString(),
                                                    marks:
                                                      cell.content[0].marks,
                                                  },
                                                ],
                                              },
                                            ],
                                          },
                                          data,
                                        );
                                      break;
                                    default:
                                      break;
                                  }
                                }
                              }
                            }

                            return [event || {}, average || {}, ranking || {}];
                          })
                        : []),
                    ],
                  },
                  layout: "lightHorizontalLines",
                  width: "auto",
                },
                { width: "*", text: "" },
              ],
            };
          default:
            return null;
        }
      })
      .filter(Boolean);
  };

  const generatePDF = (action: "open" | "download") => {
    try {
      const docDefinition = {
        info: {
          title: `Certificados - ${competition.name}`,
          author: "Cubing México",
        },
        content: selectedPodiums?.map((data, index) => ({
          stack: renderDocumentContent(content, data),
          pageBreak: index < selectedPodiums.length - 1 ? "after" : "",
        })),
        background(currentPage, pageSize) {
          if (background) {
            return {
              image: background,
              width: pageSize.width,
              height: pageSize.height,
            };
          }
          return null;
        },
        pageMargins,
        pageOrientation,
        pageSize,
        styles: {
          header1: {
            fontSize: 33.231,
            lineHeight: 1,
          },
          header2: {
            fontSize: 24.923,
            lineHeight: 1,
          },
          header3: {
            fontSize: 20.769,
            lineHeight: 1,
          },
          header4: {
            fontSize: 16.615,
            lineHeight: 1,
          },
          header5: {
            fontSize: 14.538,
            lineHeight: 1,
          },
          header6: {
            fontSize: 12.462,
            lineHeight: 1,
          },
          paragraph: {
            fontSize: 12.462,
            lineHeight: 1,
          },
        },
        language: "es",
      } as TDocumentDefinitions;

      const pdf = pdfMake.createPdf(docDefinition, undefined, fontDeclarations);

      if (action === "open") {
        pdf.open();
      } else {
        pdf.download(`Certificados Podio - ${competition.name}.pdf`);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Error al generar el PDF", {
        description: "Por favor, inténtalo de nuevo más tarde.",
      });
    }
  };

  const generateParticipantPDF = (action: "open" | "download") => {
    try {
      const docDefinition = {
        info: {
          title: `Certificados - ${competition.name}`,
          author: "Cubing México",
        },
        content: selectedParticipants?.map((data, index) => ({
          stack: renderParticipantDocumentContent(participantsContent, data),
          pageBreak: index < selectedParticipants.length - 1 ? "after" : "",
        })),
        background(currentPage, pageSize) {
          if (backgroundParticipants) {
            return {
              image: backgroundParticipants,
              width: pageSize.width,
              height: pageSize.height,
            };
          }
          return null;
        },
        pageMargins: pageMarginsParticipants,
        pageOrientation: pageOrientationParticipants,
        pageSize: pageSizeParticipants,
        styles: {
          header1: {
            fontSize: 33.231,
            lineHeight: 1,
          },
          header2: {
            fontSize: 24.923,
            lineHeight: 1,
          },
          header3: {
            fontSize: 20.769,
            lineHeight: 1,
          },
          header4: {
            fontSize: 16.615,
            lineHeight: 1,
          },
          header5: {
            fontSize: 14.538,
            lineHeight: 1,
          },
          header6: {
            fontSize: 12.462,
            lineHeight: 1,
          },
          paragraph: {
            fontSize: 12.462,
            lineHeight: 1,
          },
        },
        language: "es",
      } as TDocumentDefinitions;

      const pdf = pdfMake.createPdf(docDefinition, undefined, fontDeclarations);
      if (action === "open") {
        pdf.open();
      } else {
        pdf.download(`Certificados Participacion - ${competition.name}.pdf`);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Error al generar el PDF", {
        description: "Por favor, inténtalo de nuevo más tarde.",
      });
    }
  };

  const eventNames: Record<string, string> = {
    "333": "Cubo 3x3x3",
    "222": "Cubo 2x2x2",
    "444": "Cubo 4x4x4",
    "555": "Cubo 5x5x5",
    "666": "Cubo 6x6x6",
    "777": "Cubo 7x7x7",
    "333bf": "3x3x3 Blindfolded",
    "333fm": "3x3x3 Fewest Moves",
    "333oh": "3x3x3 One-Handed",
    clock: "Clock",
    minx: "Megaminx",
    pyram: "Pyraminx",
    skewb: "Skewb",
    sq1: "Square-1",
    "444bf": "4x4x4 Blindfolded",
    "555bf": "5x5x5 Blindfolded",
    "333mbf": "3x3x3 Multi-Blind",
  };

  const handleTemplateChange = (
    value: "general" | "female" | "newcomer" | "age",
  ) => {
    setSelectedTemplate(value);
  };

  const removeAccents = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filteredPersons = persons
    .filter((person) =>
      removeAccents(person.name.toLowerCase()).includes(
        removeAccents(searchParticipant.toLowerCase()),
      ),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

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
            <BreadcrumbLink>Certificados</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Certificados: {competition.name}
        </h1>
        <p className="text-muted-foreground">
          Gestiona los certificados de podio y participación para esta
          competencia.
        </p>
      </div>
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
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

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Estado de los Certificados</CardTitle>
              <CardDescription>
                Información sobre los certificados generados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">
                      Certificados de Podio
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {Math.ceil((podiumsData?.length ?? 0) / 3)} de{" "}
                      {competition.event_ids.length} generados
                    </span>
                  </div>
                  <Progress
                    value={
                      podiumsData
                        ? (Math.ceil(podiumsData.length / 3) /
                            competition.event_ids.length) *
                          100
                        : 0
                    }
                    className={`h-2 transition-all ${
                      podiumsData &&
                      Math.ceil(podiumsData.length / 3) ===
                        competition.event_ids.length
                        ? "*:bg-green-600"
                        : ""
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">
                      Certificados de Participación
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {participantsData?.length || 0} de {persons.length}{" "}
                      generados
                    </span>
                  </div>
                  <Progress
                    value={
                      participantsData
                        ? (participantsData.length / persons.length) * 100
                        : 0
                    }
                    className={`h-2 transition-all ${
                      participantsData &&
                      participantsData.length === persons.length
                        ? "*:bg-green-600"
                        : ""
                    }`}
                  />
                </div>
              </div>
              <div className="rounded-md bg-muted/50 p-4">
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
                    disabled={isLoadingParticipants || isLoadingPodiums}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void mutateParticipants();
                      void mutatePodiums();
                      setLastUpdate(new Date());
                    }}
                    className="dark:bg-background"
                  >
                    <RefreshCw />
                    Actualizar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "podium" | "participation")
          }
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="podium">
              <Award className="size-4 mr-2" />
              Certificados de Podio ({Math.ceil((podiumsData?.length ?? 0) / 3)}
              )
            </TabsTrigger>
            <TabsTrigger value="participation">
              <FileText className="size-4 mr-2" />
              Certificados de Participación ({participantsData?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="podium" className="space-y-6 pt-6">
            <div className="grid gap-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="mr-2 h-5 w-5" />
                      Configuración
                    </CardTitle>
                    <CardDescription>
                      Selecciona los eventos para los que se generarán los
                      certificados
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="podiumType">Tipo de podio</Label>
                        <Select
                          value={selectedTemplate}
                          onValueChange={handleTemplateChange}
                        >
                          <SelectTrigger className="w-full" id="podiumType">
                            <SelectValue placeholder="Seleccionar tipo de podio" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="female">Femeniles</SelectItem>
                            <SelectItem value="newcomer">
                              Primera vez
                            </SelectItem>
                            <SelectItem value="age">Edad</SelectItem>
                          </SelectContent>
                        </Select>
                        {selectedTemplate === "newcomer" && (
                          <p className="text-xs text-muted-foreground">
                            Competidores que no tienen WCA ID (primera
                            competencia), solo disponible antes de que se
                            publiquen los resultados oficiales de la
                            competencia.
                          </p>
                        )}
                        {selectedTemplate === "age" && (
                          <div className="space-y-3 mt-2">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">
                                Archivo CSV con fechas de nacimiento
                              </Label>
                              <Input
                                type="file"
                                accept=".csv,text/csv"
                                onChange={(e) => {
                                  const files = e.target.files;
                                  if (files && files.length > 0) {
                                    setCsvFiles([files[0]!]);
                                  } else {
                                    setCsvFiles([]);
                                  }
                                }}
                              />
                              <p className="text-xs text-muted-foreground">
                                CSV con columnas{" "}
                                <span className="font-medium">
                                  Registrant Id
                                </span>{" "}
                                y{" "}
                                <span className="font-medium">Birth Date</span>{" "}
                                (YYYY-MM-DD). La edad se calcula al último día
                                de la competencia. Sube el archivo antes de
                                generar.
                              </p>
                              {csvError && (
                                <p className="text-xs text-destructive">
                                  {csvError}
                                </p>
                              )}
                              {birthdateMap && birthdateMap.size > 0 && (
                                <p className="text-xs text-green-600 dark:text-green-500">
                                  ✓ {birthdateMap.size} competidor
                                  {birthdateMap.size !== 1 ? "es" : ""} cargado
                                  {birthdateMap.size !== 1 ? "s" : ""}
                                </p>
                              )}
                            </div>
                            {birthdateMap && birthdateMap.size > 0 && (
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">
                                  Rango de edad
                                </Label>
                                <Slider
                                  value={tempAgeRange}
                                  onValueChange={(value) =>
                                    setTempAgeRange(value as [number, number])
                                  }
                                  onValueCommit={(value) =>
                                    setAgeRange(value as [number, number])
                                  }
                                  min={0}
                                  max={100}
                                  step={1}
                                  className="mt-2"
                                />
                                <p className="text-xs text-muted-foreground">
                                  {tempAgeRange[0]} - {tempAgeRange[1]} años
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="filterByCountry"
                          className="text-sm font-medium"
                        >
                          Filtrar por país
                        </Label>
                        <div className="flex items-center gap-2 h-10 px-3">
                          <Switch
                            id="filterByCountry"
                            checked={filterByCountry}
                            onCheckedChange={(checked) =>
                              setFilterByCountry(!!checked)
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            {filterByCountry ? "Habilitado" : "Deshabilitado"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Eventos</h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {competition.event_ids.map((eventId) => (
                          <div
                            key={eventId}
                            className="flex items-center space-x-2 rounded-md p-2 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={(e) => {
                              // Only trigger if clicking the container, not the checkbox or label
                              if (e.target === e.currentTarget) {
                                const checkbox = document.getElementById(
                                  `event-${eventId}`,
                                );
                                checkbox?.click();
                              }
                            }}
                          >
                            <Checkbox
                              id={`event-${eventId}`}
                              checked={
                                selectedPodiums.filter(
                                  (podium) => podium.event === eventId,
                                ).length > 0
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const podium = podiumsData?.filter(
                                    (podium) => podium.event === eventId,
                                  );
                                  if (podium) {
                                    setSelectedPodiums((prev) => [
                                      ...prev,
                                      ...podium,
                                    ]);
                                  }
                                } else {
                                  setSelectedPodiums((prev) =>
                                    prev.filter(
                                      (podium) => podium.event !== eventId,
                                    ),
                                  );
                                }
                              }}
                              disabled={
                                podiumsData?.filter(
                                  (podium) => podium.event === eventId,
                                ).length === 0
                              }
                            />
                            <Label
                              htmlFor={`event-${eventId}`}
                              className="flex gap-2 items-center cursor-pointer flex-1"
                            >
                              <span
                                className={`cubing-icon event-${eventId}`}
                              />
                              <p className="text-xs">
                                {eventNames[eventId] || eventId}
                              </p>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <div className="flex flex-wrap justify-start gap-2 w-full">
                      <Button
                        aria-label="Seleccionar todos"
                        onClick={() => {
                          if (selectedPodiums.length === podiumsData?.length) {
                            setSelectedPodiums([]);
                          } else {
                            setSelectedPodiums(podiumsData || []);
                          }
                        }}
                        variant="outline"
                        size="sm"
                      >
                        {selectedPodiums.length === podiumsData?.length ? (
                          <X />
                        ) : (
                          <Check />
                        )}
                        {selectedPodiums.length === podiumsData?.length
                          ? "Desmarcar todos"
                          : "Seleccionar todos"}
                      </Button>
                      {selectedPodiums.length > 0 && (
                        <Button
                          aria-label="Borrar selección"
                          onClick={() => {
                            setSelectedPodiums([]);
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                          Borrar selección
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 w-full">
                      <Button
                        disabled={selectedPodiums.length === 0}
                        onClick={() => generatePDF("open")}
                        variant="outline"
                      >
                        <Eye />
                        Vista previa ({Math.ceil(selectedPodiums.length / 3)})
                      </Button>
                      <Button
                        disabled={selectedPodiums.length === 0}
                        onClick={() => generatePDF("download")}
                      >
                        <Download />
                        Descargar ({Math.ceil(selectedPodiums.length / 3)})
                      </Button>
                    </div>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Fondo</CardTitle>
                    <CardDescription>
                      Personaliza el fondo del certificado de podio
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FileUploader files={files} setFiles={setFiles} />
                  </CardContent>
                </Card>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <Tiptap
                  competitionId={competition.id}
                  content={content}
                  key={`${pageSize}-${pageOrientation}-${pageMargins}`}
                  onChange={(newContent: JSONContent) => {
                    setContent(newContent);
                  }}
                  pageMargins={pageMargins}
                  pageOrientation={pageOrientation}
                  pageSize={pageSize}
                  pdfDisabled={selectedPodiums.length === 0}
                  pdfOnClick={() => generatePDF("download")}
                  setPageMargins={(value: Margins) => {
                    setPageMargins(value);
                  }}
                  setPageOrientation={(value: PageOrientation) => {
                    setPageOrientation(value);
                  }}
                  setPageSize={(value: PageSize) => {
                    setPageSize(value);
                  }}
                  background={background}
                  variant="podium"
                />
              </form>
            </div>
          </TabsContent>

          <TabsContent value="participation" className="space-y-6 pt-6">
            <div className="grid gap-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="mr-2 h-5 w-5" />
                      Configuración
                    </CardTitle>
                    <CardDescription>
                      Selecciona los participantes para los que se generarán los
                      certificados
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar participante"
                        value={searchParticipant}
                        onChange={(e) => {
                          setSearchParticipant(e.target.value);
                        }}
                        className="pl-9 pr-9"
                      />
                      {searchParticipant && (
                        <button
                          onClick={() => setSearchParticipant("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          type="button"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Participantes</h4>
                      <ScrollArea
                        className="h-80 rounded-md border bg-muted/20 p-4"
                        type="always"
                      >
                        <div className="grid sm:grid-cols-2 gap-3 pr-3">
                          {filteredPersons.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No se encontraron participantes
                            </p>
                          ) : (
                            <>
                              {filteredPersons.map((person) => (
                                <div
                                  key={person.registrantId}
                                  className="flex items-center space-x-2 rounded-md p-2 hover:bg-background/80 transition-colors cursor-pointer"
                                  onClick={(e) => {
                                    // Only trigger if clicking the container, not the checkbox or label
                                    if (e.target === e.currentTarget) {
                                      const checkbox = document.getElementById(
                                        String(person.registrantId),
                                      );
                                      checkbox?.click();
                                    }
                                  }}
                                >
                                  <Checkbox
                                    id={String(person.registrantId)}
                                    checked={
                                      selectedParticipants.filter(
                                        (participant) =>
                                          participant.registrantId ===
                                          person.registrantId,
                                      ).length > 0
                                    }
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        const participant =
                                          participantsData?.filter(
                                            (participant) =>
                                              participant.registrantId ===
                                              person.registrantId,
                                          );
                                        if (participant) {
                                          setSelctedParticipants((prev) => [
                                            ...prev,
                                            ...participant,
                                          ]);
                                        }
                                      } else {
                                        setSelctedParticipants((prev) =>
                                          prev.filter(
                                            (participant) =>
                                              participant.registrantId !==
                                              person.registrantId,
                                          ),
                                        );
                                      }
                                    }}
                                    disabled={
                                      participantsData?.filter(
                                        (participant) =>
                                          participant.registrantId ===
                                          person.registrantId,
                                      ).length === 0
                                    }
                                  />
                                  <Label
                                    htmlFor={String(person.registrantId)}
                                    className="cursor-pointer flex-1"
                                  >
                                    <p className="text-xs leading-relaxed">
                                      {person.name}
                                    </p>
                                  </Label>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <div className="flex flex-wrap justify-start gap-2 w-full">
                      <Button
                        aria-label="Seleccionar todos"
                        onClick={() => {
                          if (
                            selectedParticipants.length ===
                            participantsData?.length
                          ) {
                            setSelctedParticipants([]);
                          } else {
                            setSelctedParticipants(participantsData || []);
                          }
                        }}
                        variant="outline"
                        size="sm"
                      >
                        {selectedParticipants.length ===
                        participantsData?.length ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        {selectedParticipants.length ===
                        participantsData?.length
                          ? "Desmarcar todos"
                          : "Seleccionar todos"}
                      </Button>
                      {selectedParticipants.length > 0 && (
                        <Button
                          aria-label="Borrar selección"
                          onClick={() => {
                            setSelctedParticipants([]);
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                          Borrar selección
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 w-full">
                      <Button
                        disabled={selectedParticipants.length === 0}
                        variant="outline"
                        onClick={() => generateParticipantPDF("open")}
                      >
                        <Eye />
                        Vista previa ({selectedParticipants.length})
                      </Button>
                      <Button
                        disabled={selectedParticipants.length === 0}
                        onClick={() => generateParticipantPDF("download")}
                      >
                        <Download />
                        Descargar ({selectedParticipants.length})
                      </Button>
                    </div>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Fondo</CardTitle>
                    <CardDescription>
                      Personaliza el fondo del certificado de participación
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FileUploader
                      files={filesParticipants}
                      setFiles={setFilesParticipants}
                    />
                  </CardContent>
                </Card>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <Tiptap
                  competitionId={competition.id}
                  content={participantsContent}
                  key={`${pageSizeParticipants}-${pageOrientationParticipants}-${pageMarginsParticipants}`}
                  onChange={(newContent: JSONContent) => {
                    setParticipantsContent(newContent);
                  }}
                  pageMargins={pageMarginsParticipants}
                  pageOrientation={pageOrientationParticipants}
                  pageSize={pageSizeParticipants}
                  pdfDisabled={selectedParticipants.length === 0}
                  pdfOnClick={() => generateParticipantPDF("download")}
                  setPageMargins={(value: Margins) => {
                    setPageMarginsParticipants(value);
                  }}
                  setPageOrientation={(value: PageOrientation) => {
                    setPageOrientationParticipants(value);
                  }}
                  setPageSize={(value: PageSize) => {
                    setPageSizeParticipants(value);
                  }}
                  background={backgroundParticipants}
                  variant="participation"
                />
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
