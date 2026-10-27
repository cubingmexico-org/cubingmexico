"use client";

import { useState } from "react";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import type { Competition } from "@/types/wca";
import type { ExtendedPerson, WCIF } from "@/types/wcif";
import type { State, Team } from "@/db/queries";
import { useCanvasStore } from "@/lib/canvas-store";
import { Canvas } from "./canvas/canvas";
import { CompetitionInfoCard } from "./certificates/competition-info-card";
import { parseCompetitionDates } from "./certificates/utils";
import { BadgeBackgroundsCard } from "./badges/badge-backgrounds-card";
import { BadgeStatusCard } from "./badges/badge-status-card";
import { MobileUnavailableCard } from "./badges/mobile-unavailable-card";
import { PersonSelectionCard } from "./badges/person-selection-card";
import { useBackgroundFile } from "./badges/use-background-file";

interface BadgeManagerProps {
  competition: Competition;
  persons: ExtendedPerson[];
  states: State[];
  teams: Team[];
  wcif: WCIF;
  competitionLogoUrl?: string | null;
}

export function BadgeManager({
  competition,
  persons,
  states,
  teams,
  wcif,
  competitionLogoUrl,
}: BadgeManagerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [backFiles, setBackFiles] = useState<File[]>([]);

  const { setBackgroundImage, setBackgroundImageBack, enableBackSide } =
    useCanvasStore();

  useBackgroundFile(files, setBackgroundImage);
  useBackgroundFile(backFiles, setBackgroundImageBack);

  const isMobile = useIsMobile();

  if (!competition) {
    notFound();
  }

  if (isMobile) {
    return <MobileUnavailableCard competitionName={competition.name} />;
  }

  const { formattedDate } = parseCompetitionDates(competition);

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/" aria-label="Inicio">
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
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tighter sm:text-4xl">
          {competitionLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external WCA / UploadThing URL
            <img
              src={competitionLogoUrl}
              alt=""
              className="size-10 shrink-0 rounded-md object-contain sm:size-12"
            />
          ) : null}
          <span>Gafetes: {competition.name}</span>
        </h1>
        <p className="text-muted-foreground">
          Gestiona los gafetes para esta competencia.
        </p>
      </div>
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <CompetitionInfoCard
            competition={competition}
            formattedDate={formattedDate}
            competitorCount={persons.length}
          />
          <BadgeStatusCard
            competitionId={competition.id}
            personCount={persons.length}
          />
        </div>

        <div className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <PersonSelectionCard
              competition={competition}
              persons={persons}
              states={states}
              teams={teams}
              wcif={wcif}
              competitionLogoUrl={competitionLogoUrl}
            />
            <BadgeBackgroundsCard
              enableBackSide={enableBackSide}
              files={files}
              setFiles={setFiles}
              backFiles={backFiles}
              setBackFiles={setBackFiles}
            />
          </div>

          <Canvas
            states={states}
            teams={teams}
            eventIds={competition.event_ids}
            persons={persons}
            wcif={wcif}
            competitionLogoUrl={competitionLogoUrl}
          />
        </div>
      </div>
    </div>
  );
}
