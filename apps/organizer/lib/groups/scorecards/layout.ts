import type { Content } from "pdfmake/interfaces";
import {
  type ScorecardDensity,
  type ScorecardPaperSize,
} from "@/lib/groups/config";

const PAPER_BASE = {
  a4: {
    pageWidth: 595.28,
    pageHeight: 841.89,
    perRow: 2,
    perPage: 4,
    hMargin: 14,
    vMargin: 12,
  },
  letter: {
    pageWidth: 612,
    pageHeight: 792,
    perRow: 2,
    perPage: 4,
    hMargin: 14,
    vMargin: 10,
  },
  a6: {
    pageWidth: 297.64,
    pageHeight: 419.53,
    perRow: 1,
    perPage: 1,
    hMargin: 14,
    vMargin: 14,
  },
} as const;

export type PaperLayout = {
  pageWidth: number;
  pageHeight: number;
  perRow: number;
  perPage: number;
  hMargin: number;
  vMargin: number;
};

export function resolvePaperLayout(
  size: ScorecardPaperSize,
  density: ScorecardDensity,
): PaperLayout {
  const base = PAPER_BASE[size] ?? PAPER_BASE.letter;
  if (size === "a6" || density === "compact") {
    return { ...base };
  }
  // Comfortable: 2 full-width cards stacked on A4/Letter.
  return {
    pageWidth: base.pageWidth,
    pageHeight: base.pageHeight,
    perRow: 1,
    perPage: 2,
    hMargin: base.hMargin,
    vMargin: Math.max(base.vMargin, 12),
  };
}

/** Inner width of one scorecard cell in the page grid (between cut lines). */
export function scorecardCellWidth(paper: PaperLayout): number {
  return (paper.pageWidth - paper.hMargin * (paper.perRow + 1)) / paper.perRow;
}

export const noBorder = {
  border: [false, false, false, false] as [boolean, boolean, boolean, boolean],
};

export function scorecardBackgroundPositions(
  paper: PaperLayout,
  imageSize: number,
) {
  const cols = paper.perRow;
  const rows = paper.perPage / paper.perRow;
  const colWidth = scorecardCellWidth(paper);
  const contentHeight = paper.pageHeight - 2 * paper.vMargin;
  const rowGap = paper.vMargin;
  const rowHeight = (contentHeight - rowGap * Math.max(0, rows - 1)) / rows;
  const positions: Array<{ x: number; y: number }> = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push({
        x:
          paper.hMargin +
          col * (colWidth + paper.hMargin) +
          (colWidth - imageSize) / 2,
        y:
          paper.vMargin +
          row * (rowHeight + rowGap) +
          (rowHeight - imageSize) / 2,
      });
    }
  }
  return positions;
}

export function cutLines(paper: PaperLayout): Content {
  const color = "#888888";
  const lw = 0.5;
  const dash = { length: 8, space: 4 };
  const marks: Array<Record<string, unknown>> = [];

  if (paper.perPage === 4) {
    marks.push(
      {
        type: "line",
        x1: paper.hMargin,
        y1: paper.pageHeight / 2,
        x2: paper.pageWidth - paper.hMargin,
        y2: paper.pageHeight / 2,
        lineWidth: lw,
        dash,
        lineColor: color,
      },
      {
        type: "line",
        x1: paper.pageWidth / 2,
        y1: paper.vMargin,
        x2: paper.pageWidth / 2,
        y2: paper.pageHeight - paper.vMargin,
        lineWidth: lw,
        dash,
        lineColor: color,
      },
    );
  } else if (paper.perPage === 2) {
    marks.push({
      type: "line",
      x1: paper.hMargin,
      y1: paper.pageHeight / 2,
      x2: paper.pageWidth - paper.hMargin,
      y2: paper.pageHeight / 2,
      lineWidth: lw,
      dash,
      lineColor: color,
    });
  }

  if (marks.length === 0) return { text: "" };
  return { canvas: marks } as unknown as Content;
}
