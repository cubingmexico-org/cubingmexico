export const SITE_SEARCH_MIN_LENGTH = 2;
export const SITE_SEARCH_MAX_LENGTH = 64;

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
