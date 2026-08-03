import { Person, TeamMember } from "@workspace/db/schema";

export interface Member {
  wcaId: Person["wcaId"];
  name: Person["name"];
  gender: Person["gender"];
  role: TeamMember["role"] | null;
  podiums: number;
  stateRecords: unknown;
  specialties: TeamMember["specialties"];
  // achievements: TeamMember["achievements"];
}
