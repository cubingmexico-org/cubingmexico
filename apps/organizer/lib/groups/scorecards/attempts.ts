import type { Content } from "pdfmake/interfaces";
import { type FormatInfo } from "@/lib/groups/formats";
import { type ScorecardLabels, labelCell } from "./labels";
import { noBorder } from "./layout";

type AttemptLayout = "timed" | "fmc" | "mbld";

export function attemptLayoutOf(formatInfo: FormatInfo): AttemptLayout {
  if (formatInfo.isFmc) return "fmc";
  if (formatInfo.isMbld) return "mbld";
  return "timed";
}

export function attemptColumnWidths(
  layout: AttemptLayout,
  printScrambleChecker: boolean,
  comfortable: boolean,
): Array<number | string> {
  if (layout === "fmc") {
    return [16, "*", 25, 25];
  }
  if (layout === "mbld") {
    if (comfortable) {
      return [16, 40, 45, "*", 25, 25];
    }
    return [16, 30, "*", 25, 25];
  }
  // Groupifier timed widths
  return [16, 25, ...(printScrambleChecker ? [25] : []), "*", 25, 25];
}

export function attemptHeaderRow(
  layout: AttemptLayout,
  labels: ScorecardLabels,
  printScrambleChecker: boolean,
  comfortable: boolean,
): Content[] {
  if (layout === "fmc") {
    return [
      labelCell(""),
      labelCell(labels.moves, { alignment: "center" }),
      labelCell(labels.judge, { alignment: "center" }),
      labelCell(labels.competitor, { alignment: "center" }),
    ];
  }
  if (layout === "mbld") {
    if (comfortable) {
      return [
        labelCell(""),
        labelCell(labels.solved, { alignment: "center" }),
        labelCell(labels.attempted, { alignment: "center" }),
        labelCell(labels.time, { alignment: "center" }),
        labelCell(labels.judge, { alignment: "center" }),
        labelCell(labels.competitor, { alignment: "center" }),
      ];
    }
    return [
      labelCell(""),
      labelCell("R/I", { alignment: "center" }),
      labelCell(labels.time, { alignment: "center" }),
      labelCell(labels.judge, { alignment: "center" }),
      labelCell(labels.competitor, { alignment: "center" }),
    ];
  }
  return [
    labelCell(""),
    labelCell(labels.scramble, { alignment: "center" }),
    ...(printScrambleChecker
      ? [labelCell(labels.check, { alignment: "center" })]
      : []),
    labelCell(labels.result, { alignment: "center" }),
    labelCell(labels.judge, { alignment: "center" }),
    labelCell(labels.competitor, { alignment: "center" }),
  ];
}

export function attemptRow(
  attemptNumber: number | string,
  layout: AttemptLayout,
  printScrambleChecker: boolean,
  comfortable: boolean,
): Content[] {
  // Empty `{}` cells match Groupifier — `{ text: "" }` adds extra line box height
  // and can push the 2nd row of a page onto the next sheet.
  const num = {
    text: String(attemptNumber),
    ...noBorder,
    fontSize: 20,
    bold: true,
    alignment: "center",
  };
  if (layout === "fmc") {
    return [num, {}, {}, {}] as Content[];
  }
  if (layout === "mbld") {
    if (comfortable) {
      return [num, {}, {}, {}, {}, {}] as Content[];
    }
    return [num, {}, {}, {}, {}] as Content[];
  }
  return [
    num,
    {},
    ...(printScrambleChecker ? [{}] : []),
    {},
    {},
    {},
  ] as Content[];
}

export function colSpanFor(
  layout: AttemptLayout,
  printScrambleChecker: boolean,
  comfortable: boolean,
): number {
  if (layout === "fmc") return 4;
  if (layout === "mbld") return comfortable ? 6 : 5;
  return 5 + (printScrambleChecker ? 1 : 0);
}

export function attemptRows(
  attemptCount: number,
  cutoffAttempts: number | null,
  scorecardWidth: number,
  layout: AttemptLayout,
  printScrambleChecker: boolean,
  comfortable: boolean,
): Content[][] {
  const rows: Content[][] = [];
  const span = colSpanFor(layout, printScrambleChecker, comfortable);
  for (let i = 0; i < attemptCount; i++) {
    rows.push(attemptRow(i + 1, layout, printScrambleChecker, comfortable));
    if (i < attemptCount - 1) {
      const isCutoffLine = cutoffAttempts != null && i + 1 === cutoffAttempts;
      rows.push([
        {
          ...noBorder,
          colSpan: span,
          margin: [0, 1],
          columns: !isCutoffLine
            ? []
            : [
                {
                  canvas: [
                    {
                      type: "line",
                      x1: 0,
                      y1: 0,
                      x2: scorecardWidth,
                      y2: 0,
                      dash: { length: 5 },
                    },
                  ],
                },
              ],
        } as Content,
      ]);
    }
  }
  return rows;
}

export function checkboxLine(label: string): Content {
  return {
    text: [{ text: `${label} ` }, "[ ]"],
    fontSize: 10,
    margin: [20, 4, 0, 4],
  };
}

export function initialsField(label: string): Content {
  return {
    text: [{ text: label, bold: true }, " ______"],
    alignment: "center",
    fontSize: 10,
    margin: [0, 4, 0, 4],
  };
}
