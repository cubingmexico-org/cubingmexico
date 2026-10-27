import type { ExtendedPerson } from "@/types/wcif";
import { getPrimaryRoleLabel } from "@/lib/person-roles";
import { getBadgeGroupStationFields } from "@/lib/groups/badge-fields";
import type { BadgePreviewData } from "./preview-canvas";

const PLACEHOLDER_PATTERN =
  /@(nombre|wcaid|rol|id|país|estado|team|grupo|estación)/gi;

export function isBlankBadge(person: ExtendedPerson): boolean {
  return !person.name;
}

export function replacePlaceholders(
  content: string,
  { person, states, teams, wcif }: BadgePreviewData,
): string {
  if (isBlankBadge(person)) return content.replace(PLACEHOLDER_PATTERN, "");

  content = content.replace(/@nombre/gi, person.name);
  content = content.replace(/@wcaid/gi, person.wcaId || "Nuevo");

  const rol = getPrimaryRoleLabel(person);

  content = content.replace(/@rol/gi, rol);

  content = content.replace(
    /@id/gi,
    String(person.registrantId) || "Desconocido",
  );

  const regionNames = new Intl.DisplayNames(["es"], { type: "region" });
  const countryName = regionNames.of(person.countryIso2) || "Desconocido";

  content = content.replace(/@país/gi, countryName);

  const stateName = states.find((s) => s.id === person.stateId)?.name;

  content = content.replace(/@estado/gi, stateName || "Desconocido");

  const teamName = teams.find((t) => t.stateId === person.stateId)?.name;

  content = content.replace(/@team/gi, teamName || "Desconocido");

  const { grupo, estacion } = getBadgeGroupStationFields(person, wcif);
  content = content.replace(/@grupo/gi, grupo || "—");
  content = content.replace(/@estación/gi, estacion || "—");

  return content;
}
