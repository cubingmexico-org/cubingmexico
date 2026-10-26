export interface Rank {
  personId: string;
  countryRank: number;
  best: number;
  name: string | null;
  state: string | null;
  gender: string | null;
}

export type RankSingle = Rank;
