"use client";

import { ChevronDownIcon, Download, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useState } from "react";
import { useCanvasStore } from "@/lib/canvas-store";
import type { ExtendedPerson, WCIF } from "@/types/wcif";
import type { State, Team } from "@/db/queries";
import type { Competition } from "@/types/wca";
import { createBadgeExporters } from "@/lib/badges/export";
import { createBadgeRenderer } from "@/lib/badges/render-canvas";

interface ExportBadgesButtonGroupProps {
  selectedPersons: ExtendedPerson[];
  competition: Competition;
  states: State[];
  teams: Team[];
  wcif: WCIF;
  competitionLogoUrl?: string | null;
}

export function ExportBadgesButtonGroup({
  selectedPersons,
  competition,
  states,
  teams,
  wcif,
  competitionLogoUrl,
}: ExportBadgesButtonGroupProps) {
  const [isExporting, setIsExporting] = useState(false);

  const blankPerson: ExtendedPerson = {
    name: "",
    wcaUserId: 0,
    wcaId: "",
    registrantId: 0,
    countryIso2: "",
    gender: null,
    registration: null,
    avatar: null,
    roles: [],
    assignments: [],
    personalBests: [],
    extensions: [],
    stateId: null,
  } as unknown as ExtendedPerson;

  const {
    elements,
    canvasWidth,
    canvasHeight,
    backgroundImage,
    backgroundImageBack,
    enableBackSide,
  } = useCanvasStore();

  const { pxToMm, createCanvasForSide } = createBadgeRenderer({
    competition,
    states,
    teams,
    wcif,
    competitionLogoUrl,
    elements,
    canvasWidth,
    canvasHeight,
    backgroundImage,
    backgroundImageBack,
  });

  const { exportToPNG, exportToJPG, exportToPDF, exportToPDF2x2 } =
    createBadgeExporters({
      selectedPersons,
      competition,
      setIsExporting,
      blankPerson,
      canvasWidth,
      canvasHeight,
      enableBackSide,
      pxToMm,
      createCanvasForSide,
    });

  return (
    <ButtonGroup>
      <Button variant="outline" disabled={isExporting} onClick={exportToPNG}>
        {isExporting ? (
          <>
            <Loader2 className="animate-spin" />
            Exportando...
          </>
        ) : (
          <>
            <Download />
            Exportar PNG
          </>
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="pl-2!">
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="[--radius:1rem]">
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={isExporting} onClick={exportToJPG}>
              <Download />
              Exportar JPG
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isExporting} onClick={exportToPDF}>
              <Download />
              Exportar PDF
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isExporting} onClick={exportToPDF2x2}>
              <Download />
              Exportar PDF (2x2)
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}
