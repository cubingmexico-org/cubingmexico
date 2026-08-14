import type { ExtendedPerson, Person, Role } from "@/types/wcif";

const ROLE_PRIORITY: Role[] = [
  "delegate",
  "trainee-delegate",
  "organizer",
  "staff-judge",
  "staff-scrambler",
  "staff-runner",
  "staff-dataentry",
  "staff-announcer",
  "staff-other",
];

/** True if the person has any organizer/delegate/staff WCIF role. */
export function hasOfficialRole(person: Person): boolean {
  return (person.roles ?? []).some(
    (role) =>
      role === "delegate" ||
      role === "trainee-delegate" ||
      role === "organizer" ||
      role.startsWith("staff-"),
  );
}

export function getRoleSortPriority(person: Person): number {
  const roles = person.roles ?? [];
  let best = ROLE_PRIORITY.length;
  for (const role of roles) {
    const index = ROLE_PRIORITY.indexOf(role);
    if (index !== -1 && index < best) best = index;
  }
  return best;
}

/** Gender-aware label for a single WCIF role (roster / CSV). */
export function getRoleDisplayLabel(
  role: Role,
  gender: Person["gender"],
): string {
  const female = gender === "f";
  switch (role) {
    case "delegate":
      return female ? "Delegada" : "Delegado";
    case "trainee-delegate":
      return female ? "Delegada en formación" : "Delegado en formación";
    case "organizer":
      return female ? "Organizadora" : "Organizador";
    case "staff-judge":
      return female ? "Jueza" : "Juez";
    case "staff-scrambler":
      return female ? "Mezcladora" : "Mezclador";
    case "staff-runner":
      return female ? "Corredora" : "Corredor";
    case "staff-dataentry":
      return "Captura de datos";
    case "staff-announcer":
      return female ? "Anunciadora" : "Anunciador";
    case "staff-other":
      return female ? "Voluntaria" : "Voluntario";
    default:
      return role;
  }
}

export function formatPersonRoles(person: Person): string {
  return (person.roles ?? [])
    .map((role) => getRoleDisplayLabel(role, person.gender))
    .join(", ");
}

/**
 * Coarse primary role for badge `@rol` mentions (delegate → organizer → staff → competitor).
 */
export function getPrimaryRoleLabel(person: Person | ExtendedPerson): string {
  const female = person.gender === "f";
  if (
    person.roles.includes("delegate") ||
    person.roles.includes("trainee-delegate")
  ) {
    return female ? "Delegada" : "Delegado";
  }
  if (person.roles.includes("organizer")) {
    return female ? "Organizadora" : "Organizador";
  }
  if (person.roles.find((r) => r.startsWith("staff-"))) {
    return female ? "Voluntaria" : "Voluntario";
  }
  return female ? "Competidora" : "Competidor";
}

export function comparePersonsByRoleThenName(a: Person, b: Person): number {
  const priorityDiff = getRoleSortPriority(a) - getRoleSortPriority(b);
  if (priorityDiff !== 0) return priorityDiff;
  return a.name.localeCompare(b.name, "es");
}
