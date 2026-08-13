import type { ExtendedPerson, Person } from "@/types/wcif";

export function enrichPersonsWithStates(
  persons: Person[],
  competitorStates: { wcaId: string; stateId: string | null }[],
): ExtendedPerson[] {
  return persons.map((person) => {
    const state = competitorStates.find(
      (entry) => entry.wcaId === person.wcaId,
    );

    return {
      ...person,
      stateId: state ? state.stateId : null,
    };
  });
}
