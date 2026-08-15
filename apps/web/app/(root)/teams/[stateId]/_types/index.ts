import { Person, TeamMember } from "@workspace/db/schema";

export interface Member {
  wcaId: Person["wcaId"];
  name: Person["name"];
  gender: Person["gender"];
  role: TeamMember["role"] | null;
  /** Present on manage roster; omitted on public filtered roster. */
  hideFromRoster?: boolean;
  podiums: number;
  /** Current state records (state_rank = 1). */
  stateRecords: number;
  /** Lifetime historical SR tags on results. */
  historicalStateRecords: number;
  specialties: TeamMember["specialties"];
  // achievements: TeamMember["achievements"];
}
