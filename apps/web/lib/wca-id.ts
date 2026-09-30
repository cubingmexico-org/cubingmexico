const WCA_ID_PATTERN = /^\d{4}[A-Z]{4}\d{2}$/;

export function parseWcaId(
  value: string | string[] | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim().toUpperCase();
  return WCA_ID_PATTERN.test(id) ? id : null;
}
