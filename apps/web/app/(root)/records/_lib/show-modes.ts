export const SHOW_MODES = [
  "mixed",
  "slim",
  "separate",
  "history",
  "mixed-history",
] as const;

export type ShowMode = (typeof SHOW_MODES)[number];
