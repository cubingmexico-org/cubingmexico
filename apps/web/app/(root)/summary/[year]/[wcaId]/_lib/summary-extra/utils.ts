import "server-only";

export const FEATURED_CHAMPIONSHIP_TYPES = [
  "MX",
  "_North America",
  "world",
] as const;

export function assignChampionshipPositions<
  T extends { resultId: string; pos: number | null },
>(rows: T[]): (T & { championshipPosition: number })[] {
  const sorted = [...rows].sort(
    (a, b) =>
      (a.pos ?? Number.MAX_SAFE_INTEGER) - (b.pos ?? Number.MAX_SAFE_INTEGER),
  );

  let previousOldPos: number | null = null;
  let previousNewPos = 0;

  return sorted.map((row, index) => {
    const oldPos = row.pos ?? Number.MAX_SAFE_INTEGER;
    const championshipPosition =
      oldPos === previousOldPos ? previousNewPos : index + 1;
    previousOldPos = oldPos;
    previousNewPos = championshipPosition;
    return { ...row, championshipPosition };
  });
}

export function isPersonalRecord(
  eventId: string,
  value: number,
  records: Record<string, number>,
): boolean {
  if (value <= 0) return false;
  if (records[eventId] === undefined) return true;
  return value <= records[eventId]!;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export function dayBefore(date: Date): Date {
  return new Date(date.getTime() - 24 * 60 * 60 * 1000);
}

export function mbfScore(value: number): number {
  const str = value.toString().padStart(9, "0");
  const dd = Number(str.slice(0, 2));
  const ttttt = Number(str.slice(2, 7));
  return 99 - dd + (1 - ttttt / 3600);
}
