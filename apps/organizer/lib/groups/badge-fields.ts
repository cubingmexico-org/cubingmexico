import type { Person, WCIF } from "@/types/wcif";
import {
  findActivityById,
  parseGroupNumber,
  parseRoundActivityCode,
} from "@/lib/groups/wcif-schedule";

/**
 * Compact group/station strings for badge mentions from published WCIF
 * competitor assignments.
 */
export function getBadgeGroupStationFields(
  person: Person,
  wcif: WCIF | null | undefined,
): { grupo: string; estacion: string } {
  if (!wcif) {
    return { grupo: "", estacion: "" };
  }

  const groupParts: string[] = [];
  const stationParts: string[] = [];

  for (const assignment of person.assignments ?? []) {
    if (assignment.assignmentCode !== "competitor") continue;
    const located = findActivityById(wcif, assignment.activityId);
    if (!located) continue;
    const groupNum = parseGroupNumber(located.activity.activityCode);
    if (groupNum == null) continue;

    const parsed = parseRoundActivityCode(
      located.activity.activityCode.replace(/-g\d+$/, ""),
    );
    const eventId = parsed?.eventId ?? located.activity.activityCode;
    groupParts.push(`${eventId}:G${groupNum}`);
    if (assignment.stationNumber != null) {
      stationParts.push(`${eventId}:E${assignment.stationNumber}`);
    }
  }

  return {
    grupo: groupParts.join(" "),
    estacion: stationParts.join(" "),
  };
}
