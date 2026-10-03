import type { Content } from "pdfmake/interfaces";
import { type CompetitionConfig } from "@/lib/groups/config";
import { type FormatInfo } from "@/lib/groups/formats";
import {
  attemptColumnWidths,
  attemptHeaderRow,
  attemptLayoutOf,
  attemptRow,
  attemptRows,
  checkboxLine,
  colSpanFor,
  initialsField,
} from "./attempts";
import { blankMetaTable, blankNameRow } from "./blank";
import { type ScorecardLabels, displayName, pbLineText } from "./labels";
import { noBorder } from "./layout";
import type { ScorecardPerson } from "./types";

export function buildCoverSheet(params: {
  competitionName: string;
  eventName: string;
  roundNumber: number;
  groupNumber: number;
  roomName: string;
  numberOfScorecards: number;
  labels: ScorecardLabels;
}): Content[] {
  const {
    competitionName,
    eventName,
    roundNumber,
    groupNumber,
    roomName,
    numberOfScorecards,
    labels,
  } = params;
  const m = [0, 3] as [number, number];

  return [
    {
      text: competitionName,
      bold: true,
      fontSize: 12,
      margin: m,
      alignment: "center",
      color: "#444444",
    },
    {
      text: `Grupo ${groupNumber}`,
      bold: true,
      fontSize: 22,
      margin: [0, 6, 0, 2],
      alignment: "center",
    },
    {
      text: labels.packCount(numberOfScorecards),
      fontSize: 14,
      margin: m,
      alignment: "center",
    },
    {
      text: `${eventName} · ${labels.round} ${roundNumber}`,
      fontSize: 12,
      margin: m,
      alignment: "center",
    },
    ...(roomName
      ? [
          {
            text: roomName,
            fontSize: 13,
            bold: true,
            margin: [0, 2, 0, 6] as [number, number, number, number],
            alignment: "center" as const,
          },
        ]
      : []),
    {
      text: labels.forDelegate,
      alignment: "center",
      margin: [0, 6, 0, 4],
      fontSize: 9,
    },
    checkboxLine(labels.packed(numberOfScorecards)),
    checkboxLine(labels.missingSignatures),
    {
      text: labels.incidentCards,
      fontSize: 10,
      margin: [20, 4, 0, 4],
    },
    initialsField(labels.initialsDelegate),
    {
      text: labels.forDataEntry,
      alignment: "center",
      margin: [0, 6, 0, 4],
      fontSize: 9,
    },
    checkboxLine(labels.resultsEntered),
    initialsField(labels.initialsDataEntry),
    checkboxLine(labels.incidentsLogged),
    initialsField(labels.initialsDelegate),
    checkboxLine(labels.resultsReviewed),
    initialsField(labels.initialsDelegate),
  ];
}

export function buildScorecardContent(params: {
  scorecardNumber: number | null;
  competitionName: string;
  eventName: string | null;
  eventId: string | undefined;
  roundNumber: number | null;
  groupNumber: number | null;
  person: ScorecardPerson | null;
  config: CompetitionConfig;
  formatInfo: FormatInfo;
  cutoffAttempts: number | null;
  timeLimitLabel: string | null;
  cutoffLabel: string | null;
  printScrambleChecker: boolean;
  scorecardWidth: number;
  labels: ScorecardLabels;
  qrDataUrl: string | null;
  comfortable: boolean;
}): Content[] {
  const {
    scorecardNumber,
    competitionName,
    eventName,
    eventId,
    roundNumber,
    groupNumber,
    person,
    config,
    formatInfo,
    cutoffAttempts,
    timeLimitLabel,
    cutoffLabel,
    printScrambleChecker,
    scorecardWidth,
    labels,
    qrDataUrl,
    comfortable,
  } = params;

  const printStations = config.printStations;
  const isBlank = person == null;
  const nameText = person ? displayName(person, config) : " ";
  const isNewcomer =
    person?.name && person.registrantId != null && !person.wcaId;
  const layout = attemptLayoutOf(formatInfo);
  const pbText =
    config.printPersonalBests && person ? pbLineText(person, eventId) : null;

  const stationBlock: Content | null =
    printStations && !isBlank && person?.stationNumber != null
      ? ({
          stack: [
            {
              text: labels.station,
              fontSize: 7,
              alignment: "center",
              color: "#666666",
            },
            {
              table: {
                widths: [40],
                body: [
                  [
                    {
                      text: String(person.stationNumber),
                      fontSize: comfortable ? 24 : 18,
                      bold: true,
                      alignment: "center",
                      border: [true, true, true, true],
                      borderColor: "#222222",
                      margin: [1, 2, 1, 2],
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => "#222222",
                vLineColor: () => "#222222",
              },
            },
          ],
          width: 48,
        } as Content)
      : null;

  const qrBlock: Content | null = qrDataUrl
    ? ({
        image: qrDataUrl,
        width: 24,
        height: 24,
        margin: [2, 0, 0, 0],
      } as Content)
    : null;

  const headerRight: Content[] = [];
  if (stationBlock) headerRight.push(stationBlock);
  if (qrBlock) headerRight.push(qrBlock);

  const headerInset = comfortable ? 10 : 8;
  const headerPadY = comfortable ? 10 : 8;
  const innerWidth = scorecardWidth - 2 * headerInset;

  const nameStack: Content[] = isBlank
    ? [blankNameRow(labels.name, innerWidth)]
    : [
        {
          text: nameText,
          fontSize: comfortable ? 14 : 12,
          bold: true,
          maxHeight: comfortable ? 28 : 18,
        } as Content,
      ];
  if (isNewcomer) {
    nameStack.push({
      text: labels.newcomer,
      fontSize: 8,
      bold: true,
      color: "#000000",
      margin: [0, 1, 0, 0],
    });
  }
  if (pbText) {
    nameStack.push({
      text: pbText,
      fontSize: 8,
      color: "#555555",
      margin: [0, 1, 0, 0],
    });
  }

  const sections: Content[] = [
    {
      columns: [
        {
          width: "*",
          stack: [
            {
              columns: [
                {
                  text: scorecardNumber != null ? String(scorecardNumber) : "",
                  fontSize: 10,
                  color: "#666666",
                  width: 28,
                },
                {
                  text: competitionName,
                  fontSize: 9,
                  color: "#666666",
                  alignment: "left",
                  width: "*",
                },
              ],
              margin: [0, 0, 0, 3],
            },
            { stack: nameStack },
          ],
        },
        ...(headerRight.length > 0
          ? [
              {
                width: "auto" as const,
                columns: headerRight,
                columnGap: 4,
              },
            ]
          : []),
      ],
      columnGap: 6,
      margin: [headerInset, headerPadY, headerInset, headerPadY],
    },
    (isBlank
      ? blankMetaTable(labels, innerWidth, printStations, [
          headerInset,
          0,
          headerInset,
          headerPadY + 2,
        ])
      : {
          text: [
            `${labels.event}: ${eventName || "—"}`,
            `${labels.round}: ${roundNumber ?? "—"}`,
            `${labels.group}: ${groupNumber ?? "—"}`,
            `${labels.id}: ${person?.registrantId ?? "—"}`,
          ].join("  ·  "),
          fontSize: 9,
          color: "#333333",
          margin: [headerInset, 0, headerInset, headerPadY + 2],
        }) as Content,
    {
      margin: [0, 2, 0, 0],
      table: {
        widths: attemptColumnWidths(layout, printScrambleChecker, comfortable),
        body: [
          attemptHeaderRow(layout, labels, printScrambleChecker, comfortable),
          ...attemptRows(
            formatInfo.attemptCount,
            cutoffAttempts,
            scorecardWidth,
            layout,
            printScrambleChecker,
            comfortable,
          ),
          [
            {
              text: labels.extra,
              ...noBorder,
              colSpan: colSpanFor(layout, printScrambleChecker, comfortable),
              margin: [0, 1],
              fontSize: 10,
            },
          ],
          attemptRow("–", layout, printScrambleChecker, comfortable),
        ],
      },
    },
    {
      fontSize: 9,
      margin: [0, 1, 0, 0],
      columns: [
        cutoffLabel ? { text: cutoffLabel, alignment: "left" } : { text: "" },
        timeLimitLabel
          ? { text: timeLimitLabel, alignment: "right" }
          : { text: "" },
      ],
    },
  ];

  return [
    {
      width: scorecardWidth,
      stack: sections,
    } as Content,
  ];
}
