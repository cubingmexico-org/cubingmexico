/** Mexican state ids matching `packages/db/src/seed.ts`. */
export const STATE_IDS = [
  "AGU",
  "BCN",
  "BCS",
  "CAM",
  "CHP",
  "CHH",
  "COA",
  "COL",
  "CMX",
  "DUR",
  "GUA",
  "GRO",
  "HID",
  "JAL",
  "MEX",
  "MIC",
  "MOR",
  "NAY",
  "NLE",
  "OAX",
  "PUE",
  "QUE",
  "ROO",
  "SLP",
  "SIN",
  "SON",
  "TAB",
  "TAM",
  "TLA",
  "VER",
  "YUC",
  "ZAC",
] as const;

export type StateId = (typeof STATE_IDS)[number];

/** Exact DB state names → ids (from seed). */
export const STATE_NAME_TO_ID: Record<string, StateId> = {
  Aguascalientes: "AGU",
  "Baja California": "BCN",
  "Baja California Sur": "BCS",
  Campeche: "CAM",
  Chiapas: "CHP",
  Chihuahua: "CHH",
  Coahuila: "COA",
  Colima: "COL",
  "Ciudad de México": "CMX",
  Durango: "DUR",
  Guanajuato: "GUA",
  Guerrero: "GRO",
  Hidalgo: "HID",
  Jalisco: "JAL",
  "Estado de México": "MEX",
  Michoacán: "MIC",
  Morelos: "MOR",
  Nayarit: "NAY",
  "Nuevo León": "NLE",
  Oaxaca: "OAX",
  Puebla: "PUE",
  Querétaro: "QUE",
  "Quintana Roo": "ROO",
  "San Luis Potosí": "SLP",
  Sinaloa: "SIN",
  Sonora: "SON",
  Tabasco: "TAB",
  Tamaulipas: "TAM",
  Tlaxcala: "TLA",
  Veracruz: "VER",
  Yucatán: "YUC",
  Zacatecas: "ZAC",
};

const STATE_ID_SET = new Set<string>(STATE_IDS);

/** CMX is PNG in the source dataset; all others are SVG. */
const FLAG_EXT: Partial<Record<StateId, "png" | "svg">> = {
  CMX: "png",
};

export function isStateId(value: string): value is StateId {
  return STATE_ID_SET.has(value.toUpperCase());
}

export function resolveStateId(input: {
  stateId?: string | null;
  stateName?: string | null;
}): StateId | null {
  if (input.stateId) {
    const id = input.stateId.toUpperCase();
    if (isStateId(id)) return id;
  }
  if (input.stateName) {
    return STATE_NAME_TO_ID[input.stateName] ?? null;
  }
  return null;
}

export function getStateFlagUrl(stateId: string): string | null {
  const id = stateId.toUpperCase();
  if (!isStateId(id)) return null;
  const ext = FLAG_EXT[id] ?? "svg";
  return `/flags/states/${id}.${ext}`;
}
