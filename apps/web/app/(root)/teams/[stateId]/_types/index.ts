import { Person, TeamMember } from "@workspace/db/schema";

export interface Member {
  wcaId: Person["wcaId"];
  name: Person["name"];
  gender: Person["gender"];
  isAdmin: TeamMember["isAdmin"] | null;
  podiums: number;
  stateRecords: unknown;
  specialties: TeamMember["specialties"];
  // achievements: TeamMember["achievements"];
}
