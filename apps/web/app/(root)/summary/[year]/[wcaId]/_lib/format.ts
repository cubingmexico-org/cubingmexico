import { formatAttemptValue } from "@/lib/utils";
import type { AnnualSummary } from "./queries";

export function subjectPronoun(
  gender: AnnualSummary["person"]["gender"],
): string {
  if (gender === "f") return "Ella";
  if (gender === "m") return "Él";
  return "La persona";
}

export function objectPronoun(
  gender: AnnualSummary["person"]["gender"],
): string {
  if (gender === "f") return "ella";
  if (gender === "m") return "él";
  return "esta persona";
}

export function prevYearLabel(year: number): string {
  return `≤${year - 1}`;
}

export function formatResultValue(
  eventId: string,
  value: number | null,
  resultType: "single" | "average" = "single",
): string {
  if (value === null) return "—";
  return formatAttemptValue(eventId, value, resultType) ?? "—";
}

export function formatImprovement(
  eventId: string,
  improvement: number | null,
  improvementPercent: number | null,
  resultType: "single" | "average" = "single",
): string {
  if (improvement === null || improvementPercent === null) return "—";
  const abs =
    formatAttemptValue(eventId, improvement, resultType) ?? String(improvement);
  return `${abs} (${improvementPercent.toFixed(2)}%)`;
}
