export interface NemesisStatsRow {
  rank: number;
  personId: string;
  name: string | null;
  state: string | null;
  gender: string | null;
  eventCount: number;
  nemesisCount: number;
  nemesizedCount: number;
}
