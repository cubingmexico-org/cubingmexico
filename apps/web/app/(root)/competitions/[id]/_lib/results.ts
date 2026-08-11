import { formatAttemptValue } from "@/lib/utils";
import type { CompetitionResultRow as BaseCompetitionResultRow } from "./queries";

export type CompetitionResultRow = BaseCompetitionResultRow;

export interface ResultsByPersonGroup {
  personId: string;
  personName: string | null;
  results: CompetitionResultRow[];
}

export interface EventRoundGroup {
  roundTypeId: string;
  roundLabel: string;
  rows: CompetitionResultRow[];
}

export interface ResultsByEventGroup {
  eventId: string;
  eventName: string;
  rounds: EventRoundGroup[];
}

export function formatBestResult(resultRow: CompetitionResultRow): string {
  if (resultRow.best <= 0) return "—";
  return formatAttemptValue(resultRow.eventId, resultRow.best) ?? "—";
}

export function formatAverageResult(resultRow: CompetitionResultRow): string {
  if (resultRow.average <= 0) return "—";
  return (
    formatAttemptValue(resultRow.eventId, resultRow.average, "average") ?? "—"
  );
}
