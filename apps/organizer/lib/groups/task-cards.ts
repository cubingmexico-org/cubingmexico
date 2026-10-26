import type { WCIF } from "@/types/wcif";
import { createGroupsPdf, type PrintAction } from "@/lib/groups/print-pdf";
import {
  buildAllGroupSheetsDocument,
  buildTaskCardsDocument,
} from "@/lib/groups/task-cards-document";

export function printAllGroupSheets(wcif: WCIF, action: PrintAction): void {
  const doc = buildAllGroupSheetsDocument(wcif);
  createGroupsPdf(doc, action, `${wcif.id}-group-sheets-all`);
}

export function printTaskCards(wcif: WCIF, action: PrintAction): void {
  const doc = buildTaskCardsDocument(wcif);
  createGroupsPdf(doc, action, `${wcif.id}-task-cards`);
}
