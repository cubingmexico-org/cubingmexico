export type SiteSearchPerson = {
  wcaId: string;
  name: string | null;
};

export type SiteSearchCompetition = {
  id: string;
  name: string;
  cityName: string;
};

export type SiteSearchTeam = {
  stateId: string;
  name: string;
  stateName: string;
};

export type SiteSearchResults = {
  persons: SiteSearchPerson[];
  competitions: SiteSearchCompetition[];
  teams: SiteSearchTeam[];
};
