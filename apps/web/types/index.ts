export interface SearchParams {
  [key: string]: string | string[] | undefined;
}

export type Tier =
  | "Diamante"
  | "Ópalo"
  | "Platino"
  | "Oro"
  | "Plata"
  | "Bronce";
