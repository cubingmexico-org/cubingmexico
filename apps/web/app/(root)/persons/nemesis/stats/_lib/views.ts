export const NEMESIS_STATS_VIEWS = [
  "invictos",
  "mas-nemesis",
  "nemesizados",
] as const;

export type NemesisStatsView = (typeof NEMESIS_STATS_VIEWS)[number];

export const NEMESIS_STATS_VIEW_LABELS: Record<NemesisStatsView, string> = {
  invictos: "Invictos",
  "mas-nemesis": "Más némesis",
  nemesizados: "Más nemesizados",
};

export const NEMESIS_STATS_VIEW_DESCRIPTIONS: Record<NemesisStatsView, string> =
  {
    invictos:
      "Competidores sin némesis: nadie en México les supera en todos sus eventos.",
    "mas-nemesis": "Competidores con más personas que les superan en todo.",
    nemesizados: "Competidores que son némesis de más personas.",
  };

// Includes discontinued events still present in the ranks tables.
export const MAX_MIN_EVENTS = 21;
