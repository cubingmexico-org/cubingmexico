import type { ExtendedPerson } from "@/types/wcif";
import { removeAccents } from "@/components/certificates/utils";

export type PersonGroup = {
  key: string;
  title: string;
  list: ExtendedPerson[];
};

export function filterPersons(
  persons: ExtendedPerson[],
  search: string,
  onlyCompeting: boolean,
): ExtendedPerson[] {
  const query = removeAccents(search.toLowerCase());
  return persons
    .filter(
      (person) =>
        removeAccents(person.name.toLowerCase()).includes(query) &&
        (!onlyCompeting || person.registration?.isCompeting === true),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Delegates win over organizers, organizers over volunteers; newcomers are competitors without a WCA ID. */
export function groupPersons(persons: ExtendedPerson[]): PersonGroup[] {
  const newcomers: ExtendedPerson[] = [];
  const delegates: ExtendedPerson[] = [];
  const organizers: ExtendedPerson[] = [];
  const volunteers: ExtendedPerson[] = [];
  const regulars: ExtendedPerson[] = [];

  for (const p of persons) {
    const isDelegate =
      p.roles?.includes("delegate") || p.roles?.includes("trainee-delegate");
    const isOrganizer = p.roles?.includes("organizer");
    const isVolunteer = p.roles?.find((r) => r.startsWith("staff-"));

    if (isDelegate) {
      delegates.push(p);
    } else if (isOrganizer) {
      organizers.push(p);
    } else if (isVolunteer) {
      volunteers.push(p);
    } else if (!p.wcaId) {
      newcomers.push(p);
    } else {
      regulars.push(p);
    }
  }

  return [
    { key: "delegates", title: "Delegados", list: delegates },
    { key: "organizers", title: "Organizadores", list: organizers },
    { key: "volunteers", title: "Voluntarios", list: volunteers },
    { key: "newcomers", title: "Nuevos", list: newcomers },
    { key: "regulars", title: "Competidores", list: regulars },
  ];
}
