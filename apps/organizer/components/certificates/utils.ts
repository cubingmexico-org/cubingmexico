import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Competition } from "@/types/wca";

export type CertificateTemplate = "general" | "female" | "newcomer" | "age";

export const eventNames: Record<string, string> = {
  "333": "Cubo 3x3x3",
  "222": "Cubo 2x2x2",
  "444": "Cubo 4x4x4",
  "555": "Cubo 5x5x5",
  "666": "Cubo 6x6x6",
  "777": "Cubo 7x7x7",
  "333bf": "3x3x3 Blindfolded",
  "333fm": "3x3x3 Fewest Moves",
  "333oh": "3x3x3 One-Handed",
  clock: "Clock",
  minx: "Megaminx",
  pyram: "Pyraminx",
  skewb: "Skewb",
  sq1: "Square-1",
  "444bf": "4x4x4 Blindfolded",
  "555bf": "5x5x5 Blindfolded",
  "333mbf": "3x3x3 Multi-Blind",
  fto: "FTO",
};

export const removeAccents = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function parseCompetitionDates(competition: Competition) {
  const [startYear, startMonth, startDay] = competition.start_date
    .split("-")
    .map(Number);
  const startDate = new Date(startYear!, startMonth! - 1, startDay);

  const [endYear, endMonth, endDay] = competition.end_date
    .split("-")
    .map(Number);
  const endDate = new Date(endYear!, endMonth! - 1, endDay);

  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const formattedDate = isSameDay
    ? format(startDate, "d 'de' MMMM 'de' yyyy", { locale: es })
    : `${format(startDate, "d 'de' MMM", { locale: es })} - ${format(endDate, "d 'de' MMM 'de' yyyy", { locale: es })}`;

  return { startDate, endDate, formattedDate };
}
