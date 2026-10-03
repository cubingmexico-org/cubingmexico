"use client";

import { useEffect, useState } from "react";
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
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { buttonVariants } from "@workspace/ui/components/button";
import { Award, FileText, Settings, ChevronRight, Home } from "lucide-react";
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
import { fetcher } from "@/lib/utils";
import type {
  ParticipantData,
  RegisteredPerson,
  PodiumData,
} from "@/types/wcif";
import { participation, podium } from "@/data/certificates";
import { JSONContent } from "@tiptap/react";
import { Margins, PageOrientation, PageSize } from "pdfmake/interfaces";
import { CertificateManagerSkeleton } from "./certificate-manager-skeleton";
import { toast } from "sonner";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import Papa from "papaparse";
import {
  createCertificateRenderers,
  generateParticipantPdf,
  generatePodiumPdf,
} from "./certificates/pdf-content";
import {
  parseCompetitionDates,
  removeAccents,
  type CertificateTemplate,
} from "./certificates/utils";
import { CompetitionInfoCard } from "./certificates/competition-info-card";
import { CertificatesSummaryCard } from "./certificates/certificates-summary-card";
import { PodiumCertificatesTab } from "./certificates/podium-certificates-tab";
import { ParticipationCertificatesTab } from "./certificates/participation-certificates-tab";

export function CertificateManager({
  competition,
  persons,
  competitionLogoUrl,
}: {
  competition: Competition;
  persons: RegisteredPerson[];
  competitionLogoUrl?: string | null;
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

  const [selectedTemplate, setSelectedTemplate] =
    useState<CertificateTemplate>("general");
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

  const { startDate, endDate, formattedDate } =
    parseCompetitionDates(competition);

  const { renderDocumentContent, renderParticipantDocumentContent } =
    createCertificateRenderers(competition, startDate, endDate);

  const generatePDF = (action: "open" | "download") =>
    generatePodiumPdf(action, {
      competition,
      selectedPodiums,
      content,
      background,
      pageMargins,
      pageOrientation,
      pageSize,
      renderDocumentContent,
    });

  const generateParticipantPDF = (action: "open" | "download") =>
    generateParticipantPdf(action, {
      competition,
      selectedParticipants,
      participantsContent,
      backgroundParticipants,
      pageMarginsParticipants,
      pageOrientationParticipants,
      pageSizeParticipants,
      renderParticipantDocumentContent,
    });

  const handleTemplateChange = (value: CertificateTemplate) => {
    setSelectedTemplate(value);
  };

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
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tighter sm:text-4xl">
          {competitionLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external WCA / UploadThing URL
            <img
              src={competitionLogoUrl}
              alt=""
              className="size-10 shrink-0 rounded-md object-contain sm:size-12"
            />
          ) : null}
          <span>Certificados: {competition.name}</span>
        </h1>
        <p className="text-muted-foreground">
          Gestiona los certificados de podio y participación para esta
          competencia.
        </p>
      </div>
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <CompetitionInfoCard
            competition={competition}
            formattedDate={formattedDate}
            persons={persons}
          />

          <CertificatesSummaryCard
            competition={competition}
            isLoadingParticipants={isLoadingParticipants}
            isLoadingPodiums={isLoadingPodiums}
            lastUpdate={lastUpdate}
            mutateParticipants={mutateParticipants}
            mutatePodiums={mutatePodiums}
            participantsData={participantsData}
            persons={persons}
            podiumsData={podiumsData}
            setLastUpdate={setLastUpdate}
          />
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
            <PodiumCertificatesTab
              background={background}
              birthdateMap={birthdateMap}
              competition={competition}
              content={content}
              csvError={csvError}
              files={files}
              filterByCountry={filterByCountry}
              generatePDF={generatePDF}
              handleTemplateChange={handleTemplateChange}
              pageMargins={pageMargins}
              pageOrientation={pageOrientation}
              pageSize={pageSize}
              podiumsData={podiumsData}
              selectedPodiums={selectedPodiums}
              selectedTemplate={selectedTemplate}
              setAgeRange={setAgeRange}
              setContent={setContent}
              setCsvFiles={setCsvFiles}
              setFiles={setFiles}
              setFilterByCountry={setFilterByCountry}
              setPageMargins={setPageMargins}
              setPageOrientation={setPageOrientation}
              setPageSize={setPageSize}
              setSelectedPodiums={setSelectedPodiums}
              setTempAgeRange={setTempAgeRange}
              tempAgeRange={tempAgeRange}
            />
          </TabsContent>

          <TabsContent value="participation" className="space-y-6 pt-6">
            <ParticipationCertificatesTab
              backgroundParticipants={backgroundParticipants}
              competition={competition}
              filesParticipants={filesParticipants}
              filteredPersons={filteredPersons}
              generateParticipantPDF={generateParticipantPDF}
              pageMarginsParticipants={pageMarginsParticipants}
              pageOrientationParticipants={pageOrientationParticipants}
              pageSizeParticipants={pageSizeParticipants}
              participantsContent={participantsContent}
              participantsData={participantsData}
              searchParticipant={searchParticipant}
              selectedParticipants={selectedParticipants}
              setFilesParticipants={setFilesParticipants}
              setPageMarginsParticipants={setPageMarginsParticipants}
              setPageOrientationParticipants={setPageOrientationParticipants}
              setPageSizeParticipants={setPageSizeParticipants}
              setParticipantsContent={setParticipantsContent}
              setSearchParticipant={setSearchParticipant}
              setSelctedParticipants={setSelctedParticipants}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
