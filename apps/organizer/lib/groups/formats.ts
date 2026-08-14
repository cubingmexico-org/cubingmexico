/** WCIF round format → attempt configuration for scorecards. */

export type FormatInfo = {
  attemptCount: number;
  /** Labels for each attempt column */
  attemptLabels: string[];
  /** Extra columns after attempts (e.g. mean) */
  extraLabels: string[];
  isFmc: boolean;
  isMbld: boolean;
};

const FORMAT_MAP: Record<string, { attempts: number; mean?: boolean }> = {
  "1": { attempts: 1 },
  "2": { attempts: 2 },
  "3": { attempts: 3 },
  a: { attempts: 5 },
  m: { attempts: 3, mean: true },
};

export function getFormatInfo(format: string, eventId?: string): FormatInfo {
  const isFmc = eventId === "333fm";
  const isMbld = eventId === "333mbf";
  const base = FORMAT_MAP[format] ?? FORMAT_MAP.a!;

  const attemptLabels = Array.from({ length: base.attempts }, (_, i) =>
    String(i + 1),
  );

  const extraLabels: string[] = [];
  if (base.mean || format === "m") {
    extraLabels.push("Media");
  } else if (format === "a") {
    extraLabels.push("Prom.");
  }

  if (isFmc) {
    return {
      attemptCount: base.attempts,
      attemptLabels: attemptLabels.map((n) => `Int. ${n}`),
      extraLabels: format === "m" ? ["Media"] : extraLabels,
      isFmc: true,
      isMbld: false,
    };
  }

  if (isMbld) {
    return {
      attemptCount: Math.max(base.attempts, 1),
      attemptLabels: attemptLabels.map((n) => `Int. ${n}`),
      extraLabels: [],
      isFmc: false,
      isMbld: true,
    };
  }

  return {
    attemptCount: base.attempts,
    attemptLabels,
    extraLabels,
    isFmc: false,
    isMbld: false,
  };
}
