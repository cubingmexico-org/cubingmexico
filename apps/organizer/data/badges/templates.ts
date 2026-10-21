import type { BadgeDesignFile } from "@/types/canvas";
import { classicBadge } from "./classic";
import { minimalBadge } from "./minimal";
import { stateBadge } from "./state";
import { withBackBadge } from "./with-back";

export type BadgeDesignTemplate = {
  /** Stable UUID used as the `designs` row id. Never change or reuse one. */
  id: string;
  name: string;
  document: BadgeDesignFile;
};

/** Built-in badge templates shown under "Plantillas", upserted by ensureGlobalDesignTemplates. */
export const BADGE_DESIGN_TEMPLATES: BadgeDesignTemplate[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Gafete clásico (Cubing México)",
    document: classicBadge,
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    name: "Gafete con reverso: eventos y QR (Cubing México)",
    document: withBackBadge,
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    name: "Gafete minimalista (Cubing México)",
    document: minimalBadge,
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    name: "Gafete por estado (Cubing México)",
    document: stateBadge,
  },
];

/** What the badge editor starts from and resets to. */
export const DEFAULT_BADGE_DESIGN: BadgeDesignFile = classicBadge;
