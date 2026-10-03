import type { Content } from "pdfmake/interfaces";
import type { ScorecardLabels } from "./labels";

const fillInBorder = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingLeft: () => 0,
  paddingRight: () => 2,
  paddingTop: () => 0,
  paddingBottom: () => 0,
};

function blankLabelCell(text: string): Content {
  return {
    text,
    fontSize: 7,
    color: "#333333",
    border: [false, false, false, false],
    margin: [0, 3, 1, 0],
  } as Content;
}

function blankFieldCell(): Content {
  return {
    text: " ",
    border: [true, true, true, true],
    borderColor: ["#222222", "#222222", "#222222", "#222222"],
    margin: [1, 2, 1, 2],
  } as Content;
}

export function blankNameRow(label: string, width: number): Content {
  return {
    table: {
      widths: [32, width - 32],
      body: [[blankLabelCell(`${label}:`), blankFieldCell()]],
    },
    layout: fillInBorder,
    margin: [0, 0, 0, 3],
  } as Content;
}

export function blankMetaTable(
  labels: ScorecardLabels,
  width: number,
  printStations: boolean,
  margin: [number, number, number, number],
): Content {
  const fields: Array<{ label: string; boxWeight: number }> = [
    { label: `${labels.event}:`, boxWeight: 34 },
    { label: `${labels.round}:`, boxWeight: 12 },
    { label: `${labels.group}:`, boxWeight: 12 },
    { label: `${labels.id}:`, boxWeight: 18 },
  ];
  if (printStations) {
    fields.push({ label: `${labels.station}:`, boxWeight: 12 });
  }

  const labelColWidth = 11;
  const boxSpace = width - labelColWidth * fields.length;
  const boxWeightTotal = fields.reduce(
    (sum, field) => sum + field.boxWeight,
    0,
  );
  const widths: Array<number | string> = [];
  const row: Content[] = [];
  for (const field of fields) {
    widths.push(labelColWidth);
    row.push(blankLabelCell(field.label));
    widths.push((boxSpace * field.boxWeight) / boxWeightTotal);
    row.push(blankFieldCell());
  }

  return {
    table: { widths, body: [row] },
    layout: fillInBorder,
    margin,
  } as Content;
}
