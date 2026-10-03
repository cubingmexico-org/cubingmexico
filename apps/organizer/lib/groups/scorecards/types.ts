import type { Content } from "pdfmake/interfaces";

export type ScorecardMode = "assigned" | "blank";

export type ScorecardPerson = {
  name: string;
  localName: string | null;
  wcaId: string | null;
  registrantId: number | null;
  groupNumber: number | null;
  stationNumber: number | null;
  roomName: string;
  worldRankingSingle: number | null;
  worldRankingAverage: number | null;
  nationalRankingAverage: number | null;
  pbSingle: number | null;
  pbAverage: number | null;
};

export type CardSlot =
  | { kind: "cover"; content: Content[] }
  | { kind: "scorecard"; content: Content[] }
  | { kind: "empty" };
