import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { WCIF } from "@/types/wcif";
import { getCompetitionConfig } from "@/lib/groups/config";
import { resolveScorecardsBackgroundUrl } from "@/lib/groups/competition-image";
import {
  buildAllAssignedCardList,
  buildBlankVariantCardList,
  cardCellContent,
  chunkRows,
  emptyCard,
} from "./cards";
import {
  cutLines,
  resolvePaperLayout,
  scorecardBackgroundPositions,
} from "./layout";
import type { CardSlot } from "./types";

type BackgroundOptions = {
  competitionImageUrl?: string | null;
  /** Already-loaded background; `undefined` falls back to the configured URL. */
  backgroundDataUrl?: string | null;
};

export function buildScorecardsDocumentFromCards(
  wcif: WCIF,
  cards: CardSlot[],
  title: string,
  { competitionImageUrl, backgroundDataUrl }: BackgroundOptions = {},
): TDocumentDefinitions {
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

function paperFor(wcif: WCIF) {
  const config = getCompetitionConfig(wcif);
  return {
    config,
    paper: resolvePaperLayout(
      config.scorecardPaperSize,
      config.scorecardDensity,
    ),
  };
}

/** Every assigned competitor's scorecards, in the configured order and paper size. */
export async function buildAllAssignedScorecardsDocument(
  wcif: WCIF,
  options: BackgroundOptions = {},
): Promise<TDocumentDefinitions> {
  const { config, paper } = paperFor(wcif);
  const cards = await buildAllAssignedCardList(wcif, config, paper);
  return buildScorecardsDocumentFromCards(
    wcif,
    cards,
    `Papeletas — ${wcif.shortName || wcif.name}`,
    options,
  );
}

/** Blank scorecards, one variant per round format, for walk-ins and replacements. */
export function buildBlankScorecardsDocument(
  wcif: WCIF,
  options: BackgroundOptions = {},
): TDocumentDefinitions {
  const { config, paper } = paperFor(wcif);
  const cards = buildBlankVariantCardList(wcif, config, paper);
  return buildScorecardsDocumentFromCards(
    wcif,
    cards,
    `Papeletas en blanco — ${wcif.shortName || wcif.name}`,
    options,
  );
}
