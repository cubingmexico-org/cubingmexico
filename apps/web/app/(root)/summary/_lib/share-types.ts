export type ShareHighlightTone = "default" | "gold" | "silver" | "bronze";

export type ShareHighlight = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  tone?: ShareHighlightTone;
};

/** Portrait cards use a 2×4 grid. */
export const MAX_HIGHLIGHTS = 8;

export function formatInt(n: number): string {
  return n.toLocaleString("es-MX");
}
