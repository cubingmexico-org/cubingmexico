import type { TDocumentDefinitions } from "pdfmake/interfaces";
import type { WCIF } from "@/types/wcif";
import { getCompetitionConfig } from "@/lib/groups/config";
import { resolveScorecardsBackgroundUrl } from "@/lib/groups/competition-image";
import { createGroupsPdf, type PrintAction } from "@/lib/groups/print-pdf";
import { loadImageAsDataUrl } from "@/lib/groups/load-image-data-url";
import {
  buildAllAssignedScorecardsDocument,
  buildBlankScorecardsDocument,
} from "./build-document";

type BuildScorecards = (
  wcif: WCIF,
  options: {
    competitionImageUrl?: string | null;
    backgroundDataUrl?: string | null;
  },
) => TDocumentDefinitions | Promise<TDocumentDefinitions>;

async function printScorecards(
  wcif: WCIF,
  build: BuildScorecards,
  filenameSuffix: string,
  action: PrintAction,
  competitionImageUrl?: string | null,
): Promise<void> {
  const config = getCompetitionConfig(wcif);
  const remoteUrl = resolveScorecardsBackgroundUrl(config, competitionImageUrl);
  const backgroundDataUrl = remoteUrl
    ? await loadImageAsDataUrl(remoteUrl)
    : null;

  if (remoteUrl && !backgroundDataUrl) {
    console.warn(
      "No se pudo cargar la imagen de fondo; se generan papeletas sin fondo.",
    );
  }

  const doc = await build(wcif, { competitionImageUrl, backgroundDataUrl });
  createGroupsPdf(doc, action, `${wcif.id}-${filenameSuffix}`);
}

export async function printAllAssignedScorecards(
  wcif: WCIF,
  action: PrintAction,
  competitionImageUrl?: string | null,
): Promise<void> {
  await printScorecards(
    wcif,
    buildAllAssignedScorecardsDocument,
    "scorecards-assigned-all",
    action,
    competitionImageUrl,
  );
}

export async function printBlankScorecardVariants(
  wcif: WCIF,
  action: PrintAction,
  competitionImageUrl?: string | null,
): Promise<void> {
  await printScorecards(
    wcif,
    buildBlankScorecardsDocument,
    "scorecards-blank-variants",
    action,
    competitionImageUrl,
  );
}
