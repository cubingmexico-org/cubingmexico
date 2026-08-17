export const ADMIN_OPS_JOBS = [
  {
    path: "/update-database",
    label: "Actualizar base de datos WCA",
    description: "Descarga e importa el export TSV de la WCA.",
  },
  {
    path: "/update-state-ranks",
    label: "Actualizar state ranks",
    description: "Recalcula rankings estatales.",
  },
  {
    path: "/update-state-records",
    label: "Actualizar state records",
    description: "Recalcula récords estatales históricos.",
  },
  {
    path: "/update-existing-mexican-competitions",
    label: "Actualizar competencias MX",
    description:
      "Sincroniza metadatos y organizadores/delegados de competencias mexicanas desde el export.",
  },
  {
    path: "/update-competition-schedules",
    label: "Actualizar horarios de rondas",
    description:
      "Importa fechas de fin de ronda (WCIF) para competencias con resultados (México o extranjeras) y sin horario. Hasta 50 por ejecución.",
  },
  {
    path: "/update-sum-of-ranks",
    label: "Actualizar Sum of Ranks",
    description: "Recalcula SOR.",
  },
  {
    path: "/update-kinch-ranks",
    label: "Actualizar Kinch",
    description: "Recalcula rankings Kinch.",
  },
  {
    path: "/update-streak-ranks",
    label: "Actualizar PR streaks",
    description: "Recalcula rachas de PRs.",
  },
  {
    path: "/post-summary-unlock",
    label: "Publicar resumen anual",
    description:
      "Si ya es 20 dic UTC o después, publica el anuncio de resúmenes personales y de team (idempotente).",
  },
  {
    path: "/post-weekly-digest",
    label: "Publicar resumen semanal",
    description:
      "Publica el digest SEMANA de la semana ISO actual (México), con recap W−2 + llegadas tardías (idempotente).",
  },
  {
    path: "/post-streaks-monthly",
    label: "Publicar rachas del mes",
    description:
      "Publica el spotlight mensual de rachas de PRs el último día del mes (México; idempotente; reintento hasta 3 días después).",
  },
  {
    path: "/update-all",
    label: "Actualizar todo",
    description: "Ejecuta el pipeline completo (puede tardar varios minutos).",
  },
] as const;

export type AdminOpsPath = (typeof ADMIN_OPS_JOBS)[number]["path"];

const ALLOWED_PATHS = new Set<string>(ADMIN_OPS_JOBS.map((job) => job.path));

export function isAllowedOpsPath(path: string): path is AdminOpsPath {
  return ALLOWED_PATHS.has(path);
}
