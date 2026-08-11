import { formatAttemptValue, type ResultValueType } from "@/lib/utils";

export function formatRecordResult(
  eventId: string,
  value: number | null | undefined,
  resultType: ResultValueType = "single",
): string {
  if (value == null) return "N/A";
  return formatAttemptValue(eventId, value, resultType) ?? "N/A";
}

export function formatRecordSolves(
  eventId: string,
  solves: number[],
): { key: string; text: string | null; isOutlier: boolean }[] {
  const min =
    solves.length === 5
      ? Math.min(...solves.filter((n) => n !== 0))
      : undefined;
  const max = solves.length === 5 ? Math.max(...solves) : undefined;

  return solves.map((value, index) => {
    const formatted = formatAttemptValue(eventId, value);
    const isOutlier =
      value !== 0 && (value === min || value === max) && formatted != null;

    return {
      key: `${index}-${value}`,
      text: formatted,
      isOutlier,
    };
  });
}
