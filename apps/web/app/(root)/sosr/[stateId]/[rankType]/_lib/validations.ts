import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import { getFiltersStateParser, getSortingStateParser } from "@/lib/parsers";
import type { SumOfStateRanks } from "../_types";
import { person } from "@workspace/db/schema";

export const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  sort: getSortingStateParser<SumOfStateRanks>().withDefault([
    { id: "rank", desc: false },
  ]),
  name: parseAsString.withDefault(""),
  gender: parseAsArrayOf(
    parseAsStringEnum(person.gender.enumValues),
  ).withDefault([]),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),
});

export type GetSOSRSinglesSchema = Awaited<
  ReturnType<typeof searchParamsCache.parse>
>;

export type GetSOSRAveragesSchema = Awaited<
  ReturnType<typeof searchParamsCache.parse>
>;
