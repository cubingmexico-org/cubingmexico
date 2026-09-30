import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import { getSortingStateParser } from "@/lib/parsers";
import { person } from "@workspace/db/schema";
import type { NemesisStatsRow } from "../_types";
import { NEMESIS_STATS_VIEWS } from "./views";

export const SORTABLE_COLUMNS = [
  "name",
  "eventCount",
  "nemesisCount",
  "nemesizedCount",
] as const;

export const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  sort: getSortingStateParser<NemesisStatsRow>([
    ...SORTABLE_COLUMNS,
  ]).withDefault([]),
  name: parseAsString.withDefault(""),
  state: parseAsArrayOf(parseAsString).withDefault([]),
  gender: parseAsArrayOf(
    parseAsStringEnum(person.gender.enumValues),
  ).withDefault([]),
  view: parseAsStringEnum([...NEMESIS_STATS_VIEWS]).withDefault("invictos"),
  minEvents: parseAsInteger.withDefault(1),
});

export type GetNemesisStatsSchema = Awaited<
  ReturnType<typeof searchParamsCache.parse>
>;
