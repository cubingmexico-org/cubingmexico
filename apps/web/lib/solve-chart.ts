import {
  decodeMultiBlind,
  formatAttemptValue,
  formatTime333mbf,
} from "@/lib/utils";

export function isHigherBetter(eventId: string): boolean {
  return eventId === "333mbf";
}

// Converts a raw attempt value into a numeric value suitable for the Y axis.
// Non-positive values (DNF / DNS / skipped) become null so the line shows a gap.
export function attemptToChartValue(
  eventId: string,
  value: number,
): number | null {
  if (value <= 0) {
    return null;
  }

  if (eventId === "333fm") {
    return value; // move count
  }

  if (eventId === "333mbf") {
    return decodeMultiBlind(value)?.points ?? null;
  }

  return value / 100; // centiseconds -> seconds
}

// Calculates WCA trimmed mean for AoN (Average of N)
export function calculateAoN(
  solves: (number | null)[],
  N: number,
): number | null {
  if (solves.length < N) return null;
  const window = solves.slice(solves.length - N);
  const dnfCount = window.filter((v) => v === null).length;

  let trimCount = 1;
  if (N >= 20) {
    trimCount = Math.ceil(N * 0.05); // 50 -> 3, 100 -> 5
  } else if (N <= 3) {
    trimCount = 0;
  }

  if (dnfCount > trimCount) {
    return null;
  }

  const validVals = window
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);

  const validToTrimFromTop = trimCount - dnfCount;
  const trimmed = validVals.slice(
    trimCount,
    validVals.length - validToTrimFromTop,
  );

  if (trimmed.length === 0) return null;
  const sum = trimmed.reduce((acc, val) => acc + val, 0);
  return sum / trimmed.length;
}

// Calculates standard deviation of an array of numbers
export function calculateDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

// Helper to format values for table and tooltip display
export function formatDisplayValue(
  eventId: string,
  val: number | null,
): string {
  if (val === null || Number.isNaN(val) || !Number.isFinite(val)) {
    return "—";
  }
  if (eventId === "333fm") {
    return val.toFixed(2).replace(/\.00$/, "");
  }
  if (eventId === "333mbf") {
    return Number.isInteger(val) ? `${val}` : val.toFixed(2);
  }
  return (
    formatAttemptValue(eventId, Math.round(val * 100)) ?? `${val.toFixed(2)}`
  );
}

export function formatSolveTooltipValue(
  eventId: string,
  rawSolve: number,
): string {
  if (eventId === "333mbf" && rawSolve > 0) {
    return formatTime333mbf(rawSolve);
  }
  return formatDisplayValue(eventId, attemptToChartValue(eventId, rawSolve));
}

// Helper to format total accumulated time / moves / points across all solves
export function formatTotalTime(eventId: string, val: number | null): string {
  if (val === null || Number.isNaN(val) || !Number.isFinite(val)) {
    return "—";
  }
  if (eventId === "333fm") {
    return `${Math.round(val).toLocaleString("es-MX")} movs`;
  }
  if (eventId === "333mbf") {
    return `${Math.round(val).toLocaleString("es-MX")} pts`;
  }

  if (val < 60) {
    return `${val.toFixed(2)}s`;
  }

  const seconds = val % 60;
  const totalMinutes = Math.floor(val / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  const secStr = seconds.toFixed(2).padStart(5, "0");

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secStr}s`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secStr}s`;
  }

  return `${minutes}m ${secStr}s`;
}

export function chartUnit(eventId: string): "movs" | "pts" | "s" {
  if (eventId === "333fm") return "movs";
  if (eventId === "333mbf") return "pts";
  return "s";
}

export function totalLabel(eventId: string): string {
  if (eventId === "333fm") return "Movimientos totales";
  if (eventId === "333mbf") return "Puntos totales";
  return "Tiempo total";
}

export function yAxisTick(eventId: string, value: number): string {
  if (eventId === "333fm") {
    return `${value}`;
  }
  if (eventId === "333mbf") {
    return `${Math.round(value)}`;
  }
  return formatAttemptValue(eventId, Math.round(value * 100)) ?? `${value}`;
}
