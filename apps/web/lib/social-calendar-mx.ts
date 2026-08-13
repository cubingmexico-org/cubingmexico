const MX_TIME_ZONE = "America/Mexico_City";

export const STREAKS_MONTHLY_GRACE_DAYS = 3;

function mexicoCityParts(now = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MX_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function streaksMonthlyPublishWindow(
  monthKeyStr: string,
  now = new Date(),
): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKeyStr.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return false;

  const today = mexicoCityParts(now);
  if (
    today.year === year &&
    today.month === month &&
    today.day === lastDayOfMonth(year, month)
  ) {
    return true;
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return (
    today.year === nextYear &&
    today.month === nextMonth &&
    today.day <= STREAKS_MONTHLY_GRACE_DAYS
  );
}

export function streaksMonthlyKeyIfDue(now = new Date()): string | null {
  const today = mexicoCityParts(now);
  if (today.day === lastDayOfMonth(today.year, today.month)) {
    return monthKey(today.year, today.month);
  }
  if (today.day <= STREAKS_MONTHLY_GRACE_DAYS) {
    const prevMonth = today.month === 1 ? 12 : today.month - 1;
    const prevYear = today.month === 1 ? today.year - 1 : today.year;
    const prevKey = monthKey(prevYear, prevMonth);
    if (streaksMonthlyPublishWindow(prevKey, now)) {
      return prevKey;
    }
  }
  return null;
}
