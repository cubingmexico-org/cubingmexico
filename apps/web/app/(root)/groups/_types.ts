import type { GroupMembership, Person } from "@workspace/db/schema";

export interface GroupMember {
  wcaId: Person["wcaId"];
  name: Person["name"];
  gender: Person["gender"];
  state: string | null;
  stateId: string | null;
  role: GroupMembership["role"];
  hideFromRoster: boolean;
  specialties: GroupMembership["specialties"];
}
