"use client";

import { useEffect, useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Award, FileText } from "lucide-react";
import { Competition } from "@/types/wca";
import useSWR from "swr";
import { notFound } from "next/navigation";
import { fetcher, postFetcher } from "@/lib/utils";
import type { PodiumRequest } from "@/lib/certificates/requests";
import type {
  ParticipantData,
  RegisteredPerson,
  PodiumData,
} from "@/types/wcif";
import { DEFAULT_TEMPLATES } from "@/data/certificates";
import { JSONContent } from "@tiptap/react";
import { Margins, PageOrientation, PageSize } from "pdfmake/interfaces";
import { CertificateManagerSkeleton } from "./certificate-manager-skeleton";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { useBirthdatesCsv } from "./certificates/birthdates-csv";
import { CertificatesBreadcrumb } from "./certificates/certificates-breadcrumb";
import { MobileUnavailableCard } from "./certificates/mobile-unavailable-card";
import { useFileDataUrl } from "./certificates/use-file-data-url";
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

  const { podium, participation } = DEFAULT_TEMPLATES;

  const [content, setContent] = useState<JSONContent>(podium.content);
  const [participantsContent, setParticipantsContent] = useState<JSONContent>(
    participation.content,
  );

  const [pageMargins, setPageMargins] = useState<Margins>(
    podium.pageConfig.pageMargins,
  );
  const [pageMarginsParticipants, setPageMarginsParticipants] =
    useState<Margins>(participation.pageConfig.pageMargins);

  const [pageOrientation, setPageOrientation] = useState<PageOrientation>(
    podium.pageConfig.pageOrientation,
  );
  const [pageOrientationParticipants, setPageOrientationParticipants] =
    useState<PageOrientation>(participation.pageConfig.pageOrientation);

  const [pageSize, setPageSize] = useState<PageSize>(
    podium.pageConfig.pageSize,
  );
  const [pageSizeParticipants, setPageSizeParticipants] = useState<PageSize>(
    participation.pageConfig.pageSize,
  );

  const [files, setFiles] = useState<File[]>([]);
  const [filesParticipants, setFilesParticipants] = useState<File[]>([]);

  const background = useFileDataUrl(files);
  const backgroundParticipants = useFileDataUrl(filesParticipants);

  const [selectedTemplate, setSelectedTemplate] =
    useState<CertificateTemplate>("general");
  const [searchParticipant, setSearchParticipant] = useState("");

  const [filterByCountry, setFilterByCountry] = useState(false);

  // Age filter states
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const { birthdateMap, csvError } = useBirthdatesCsv(csvFiles);
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 100]);
  const [tempAgeRange, setTempAgeRange] = useState<[number, number]>([0, 100]);

  const isMobile = useIsMobile();

  useEffect(() => {
    // Clear selected podiums when filter changes to prevent showing outdated selections
    setSelectedPodiums([]);

    // Clear age-related state when switching away from age template
    if (selectedTemplate !== "age") {
      setCsvFiles([]);
      setAgeRange([0, 100]);
      setTempAgeRange([0, 100]);
    }
  }, [filterByCountry, selectedTemplate]);

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

  const podiumRequest: PodiumRequest = {
    competitionId: competition.id,
    filterByCountry,
    country: competition.country_iso2,
    template: selectedTemplate,
    ...(selectedTemplate === "age" && birthdateMap && birthdateMap.size > 0
      ? {
          minAge: ageRange[0],
          maxAge: ageRange[1],
          birthdates: Array.from(birthdateMap.entries()),
        }
      : {}),
  };

  const {
    data: podiumsData,
    isLoading: isLoadingPodiums,
    mutate: mutatePodiums,
  } = useSWR<PodiumData[]>(
    ["/api/certificates/podium", podiumRequest],
    ([url, body]: [string, PodiumRequest]) => postFetcher(url, body),
    {
      fallbackData: [],
    },
  );

  if (isMobile) {
    return <MobileUnavailableCard competitionName={competition.name} />;
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
      <CertificatesBreadcrumb competitionName={competition.name} />

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
            competitorCount={persons.length}
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
