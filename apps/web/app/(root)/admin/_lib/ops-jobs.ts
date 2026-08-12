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
