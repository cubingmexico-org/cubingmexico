import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { WCIF } from "@/types/wcif";
import { getCompetitionConfig } from "@/lib/groups/config";
import { resolveScorecardsBackgroundUrl } from "@/lib/groups/competition-image";
import { createGroupsPdf, type PrintAction } from "@/lib/groups/print-pdf";
import { loadImageAsDataUrl } from "@/lib/groups/load-image-data-url";
import {
  buildAllAssignedCardList,
  buildBlankVariantCardList,
  buildCardList,
  cardCellContent,
  chunkRows,
  emptyCard,
} from "./cards";
import {
  cutLines,
  resolvePaperLayout,
  scorecardBackgroundPositions,
} from "./layout";
import type { CardSlot, ScorecardMode } from "./types";

export async function buildScorecardsDocument(
  wcif: WCIF,
  roundActivityCode: string,
  mode: ScorecardMode,
  blankCount: number,
  competitionImageUrl?: string | null,
  /**
   * When provided (including `null`), use this as the background and do not
   * fall back to fetching a remote URL inside pdfmake.
   */
  backgroundDataUrl?: string | null,
): Promise<TDocumentDefinitions> {
  const config = getCompetitionConfig(wcif);
  const paper = resolvePaperLayout(
    config.scorecardPaperSize,
    config.scorecardDensity,
  );
  const cards = await buildCardList(
    wcif,
    roundActivityCode,
    mode,
    blankCount,
    config,
    paper,
  );
  return buildScorecardsDocumentFromCards(
    wcif,
    cards,
    `Papeletas — ${roundActivityCode}`,
    competitionImageUrl,
    backgroundDataUrl,
  );
}

async function buildScorecardsDocumentFromCards(
  wcif: WCIF,
  cards: CardSlot[],
  title: string,
  competitionImageUrl?: string | null,
  backgroundDataUrl?: string | null,
): Promise<TDocumentDefinitions> {
  const config = getCompetitionConfig(wcif);
  const paper = resolvePaperLayout(
    config.scorecardPaperSize,
    config.scorecardDensity,
  );
  const background =
    backgroundDataUrl !== undefined
      ? backgroundDataUrl
      : resolveScorecardsBackgroundUrl(config, competitionImageUrl);

  const bgSize = paper.perPage === 2 ? 220 : paper.perPage === 1 ? 180 : 160;
  const imagePositions = scorecardBackgroundPositions(paper, bgSize);
  const marks = cutLines(paper);

  const rowsPerPage = paper.perPage / paper.perRow;
  // Page margins already inset the table. Size rows so that
  // rows * rowHeight + (rows-1) * gap fits exactly in the usable area.
  // If this overflows by even a few points, pdfmake pushes the 2nd row to the
  // next page while background watermarks still draw in the empty slots.
  const usableHeight = paper.pageHeight - 2 * paper.vMargin;
  const rowGap = paper.vMargin;
  const rowHeight =
    (usableHeight - rowGap * Math.max(0, rowsPerPage - 1)) / rowsPerPage;
  const pageChunks = chunkRows(cards, paper.perPage).map((pageCards) =>
    pageCards.length < paper.perPage
      ? [
          ...pageCards,
          ...Array.from({ length: paper.perPage - pageCards.length }, () =>
            emptyCard(),
          ),
        ]
      : pageCards,
  );

  const pageTables: Content[] = pageChunks.map((pageCards, pageIndex) => ({
    ...(pageIndex < pageChunks.length - 1
      ? { pageBreak: "after" as const }
      : {}),
    layout: {
      // paddingLeft/Right receive column index; Top/Bottom receive row index.
      // Apply the shared gap on only one side so it isn't double-counted.
      paddingLeft: (i) => (i === 0 ? 0 : paper.hMargin),
      paddingRight: () => 0,
      paddingTop: (i) => (i === 0 ? 0 : rowGap),
      paddingBottom: () => 0,
      hLineWidth: () => 0,
      vLineWidth: () => 0,
    },
    table: {
      widths: Array.from({ length: paper.perRow }, () => "*"),
      heights: rowHeight,
      dontBreakRows: true,
      body: chunkRows(pageCards.map(cardCellContent), paper.perRow),
    },
  }));

  const doc: TDocumentDefinitions = {
    info: {
      title,
      author: "Cubing México",
    },
    background: (currentPage) => {
      const pageCards = pageChunks[currentPage - 1] ?? [];
      const images = background
        ? imagePositions.flatMap((absolutePosition, slot) => {
            const card = pageCards[slot];
            if (!card || card.kind !== "scorecard") return [];
            return [
              {
                absolutePosition,
                image: "scorecardBg",
                width: bgSize,
                height: bgSize,
                opacity: 0.15,
              },
            ];
          })
        : [];
      return [...images, marks];
    },
    pageSize: { width: paper.pageWidth, height: paper.pageHeight },
    pageMargins: [paper.hMargin, paper.vMargin],
    content: pageTables,
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
    },
    language: "es",
  };

  if (background) {
    doc.images = { scorecardBg: background };
  }

  return doc;
}

export async function printScorecards(
  wcif: WCIF,
  roundActivityCode: string,
  mode: ScorecardMode,
  blankCount: number,
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

  const doc = await buildScorecardsDocument(
    wcif,
    roundActivityCode,
    mode,
    blankCount,
    competitionImageUrl,
    backgroundDataUrl,
  );
  const suffix = mode === "blank" ? "blank" : "assigned";
  createGroupsPdf(
    doc,
    action,
    `${wcif.id}-${roundActivityCode}-scorecards-${suffix}`,
  );
}

async function printScorecardsFromCards(
  wcif: WCIF,
  cards: CardSlot[],
  title: string,
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

  const doc = await buildScorecardsDocumentFromCards(
    wcif,
    cards,
    title,
    competitionImageUrl,
    backgroundDataUrl,
  );
  createGroupsPdf(doc, action, `${wcif.id}-${filenameSuffix}`);
}

export async function printAllAssignedScorecards(
  wcif: WCIF,
  action: PrintAction,
  competitionImageUrl?: string | null,
): Promise<void> {
  const config = getCompetitionConfig(wcif);
  const paper = resolvePaperLayout(
    config.scorecardPaperSize,
    config.scorecardDensity,
  );
  const cards = await buildAllAssignedCardList(wcif, config, paper);
  await printScorecardsFromCards(
    wcif,
    cards,
    `Papeletas — ${wcif.shortName || wcif.name}`,
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
  const config = getCompetitionConfig(wcif);
  const paper = resolvePaperLayout(
    config.scorecardPaperSize,
    config.scorecardDensity,
  );
  const cards = buildBlankVariantCardList(wcif, config, paper);
  await printScorecardsFromCards(
    wcif,
    cards,
    `Papeletas en blanco — ${wcif.shortName || wcif.name}`,
    "scorecards-blank-variants",
    action,
    competitionImageUrl,
  );
}
