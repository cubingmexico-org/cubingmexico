export interface Competition {
  id: string;
  name: string;
  logo: string | null;
  state: string | null;
  events: unknown;
  startDate: Date;
  endDate: Date;
  status: unknown;
  isChampionship: unknown;
}
