import type { OrganizerLevelFilter } from "@/lib/organizer-level";

export interface Person {
  wcaId: string;
  name: string | null;
  gender: string | null;
  state: string | null;
  level: OrganizerLevelFilter;
  competitions: number;
  totalCompetitions: number;
}
