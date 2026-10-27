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
    path: "/update-nemesis-stats",
    label: "Actualizar estadísticas de némesis",
    description:
      "Recalcula cuántos némesis tiene cada competidor y de cuántos es némesis.",
  },
  {
    path: "/update-cubing-contests",
    label: "Importar resultados de Cubing Contests",
    description:
      "Importa los eventos no oficiales de competencias WCA (en México o con mexicanos) desde el export de Cubing Contests. Se omite si el export no cambió.",
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
      "Publica el digest SEMANA de la semana ISO actual (México), con recap W−2 + llegadas tardías (idempotente). Debe correr después de actualizar state records para incluir SR.",
  },
  {
    path: "/post-streaks-monthly",
    label: "Publicar rachas del mes",
    description:
      "Publica el spotlight mensual de rachas de PRs el último día del mes (México; idempotente; reintento hasta 3 días después).",
  },
  {
    path: "/post-year-recap",
    label: "Publicar año en números",
    description:
      "Publica el carrusel AÑO (recap nacional + felicitación de año nuevo) el 31 de diciembre (México; idempotente; reintento hasta el 2 de enero).",
  },
  {
    path: "/update-all",
    label: "Actualizar todo",
    description:
      "Ejecuta el pipeline completo. En producción arranca un Cloud Run Job y responde de inmediato; el progreso aparece en “Ejecuciones recientes”.",
  },
  {
    path: "/update-all/resume",
    label: "Reanudar actualización completa",
    description:
      "Retoma la última ejecución fallida de “Actualizar todo” desde el paso que falló, sin repetir los pasos exitosos.",
  },
] as const;

export type AdminOpsPath = (typeof ADMIN_OPS_JOBS)[number]["path"];

/**
 * Cache tags to revalidate after a job succeeds. The backend can't reach the
 * Next cache, so pages prerendered before an import would otherwise keep
 * stale data until their cache life ends. When `/update-all` runs as a Cloud
 * Run Job (202), the job revalidates its tags through `/api/revalidate`.
 */
export const OPS_JOB_CACHE_TAGS: Partial<Record<AdminOpsPath, string[]>> = {
  "/update-database": ["data-source-dates"],
  "/update-cubing-contests": ["cc-results", "data-source-dates"],
  "/update-all": ["cc-results", "data-source-dates"],
  "/update-all/resume": ["cc-results", "data-source-dates"],
};

const ALLOWED_PATHS = new Set<string>(ADMIN_OPS_JOBS.map((job) => job.path));

export function isAllowedOpsPath(path: string): path is AdminOpsPath {
  return ALLOWED_PATHS.has(path);
}
